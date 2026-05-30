package handlers

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"gemini-cli-app/acp"
	"gemini-cli-app/checkpoint"
	"gemini-cli-app/database"
	"gemini-cli-app/models"
	"gemini-cli-app/registry"

	"github.com/gofiber/fiber/v2"
)

var confirmCues = []string{
	"shall i", "should i", "would you like", "do you want", "this sound", "proceed?",
	"do you approve", "i recommend", "i am planning",
}

func looksLikeConfirmation(output string) bool {
	o := strings.ToLower(strings.TrimSpace(output))
	if o == "" {
		return false
	}
	for _, cue := range confirmCues {
		if strings.Contains(o, cue) {
			return true
		}
	}
	return false
}

func detectAwaiting(dir, before, after, output string) bool {
	if before == "" {
		return false
	}
	if !looksLikeConfirmation(output) {
		return false
	}
	changes, err := checkpoint.Diff(dir, before, after)
	if err != nil {
		return false
	}
	return len(changes) == 0
}

func (h *Handler) History(c *fiber.Ctx) error {
	var msgs []models.Message
	if err := database.DB.Order("id asc").Find(&msgs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(msgs)
}

type chatRequest struct {
	Message string `json:"message"`
}

func (h *Handler) runTurn(c *fiber.Ctx, message string) error {
	if !acp.Available() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "gemini CLI not found. Please install: npm install -g @google/gemini-cli",
		})
	}

	dir := h.Dir()

	hash, err := checkpoint.Snapshot(dir)
	if err != nil {
		hash = ""
	}

	ctx, cancel := context.WithCancel(context.Background())
	h.mu.Lock()
	h.cancelFunc = cancel
	h.mu.Unlock()
	defer func() {
		h.mu.Lock()
		h.cancelFunc = nil
		h.mu.Unlock()
	}()

	output, err := acp.Default.Prompt(ctx, dir, h.Model(), message, nil)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": err.Error()})
	}

	userMsg, modelMsg, perr := h.persistTurn(dir, message, output, hash)
	if perr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": perr.Error()})
	}

	return c.JSON(fiber.Map{
		"user":		userMsg,
		"model":	modelMsg,
		"can_undo":	hash != "",
	})
}

func (h *Handler) Chat(c *fiber.Ctx) error {
	var body chatRequest
	if err := c.BodyParser(&body); err != nil || body.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "message required"})
	}
	return h.runTurn(c, body.Message)
}

func (h *Handler) Continue(c *fiber.Ctx) error {
	var body chatRequest
	_ = c.BodyParser(&body)
	msg := strings.TrimSpace(body.Message)
	if msg == "" {
		msg = "Yes, please continue."
	}
	return h.runTurn(c, msg)
}

func (h *Handler) persistTurn(dir, message, output, before string) (models.Message, models.Message, error) {
	after, err := checkpoint.Snapshot(dir)
	if err != nil {
		after = ""
	}
	h.setCurrent(after)
	awaiting := detectAwaiting(dir, before, after, output)

	registry.Touch(dir)
	userMsg := models.Message{Role: "user", Content: message}
	modelMsg := models.Message{
		Role:			"model",
		Content:		output,
		CheckpointHash:		before,
		CheckpointAfter:	after,
		AwaitingConfirmation:	awaiting,
	}

	tx := database.DB.Begin()
	if err := tx.Create(&userMsg).Error; err != nil {
		tx.Rollback()
		return userMsg, modelMsg, err
	}
	if err := tx.Create(&modelMsg).Error; err != nil {
		tx.Rollback()
		return userMsg, modelMsg, err
	}
	if err := tx.Commit().Error; err != nil {
		return userMsg, modelMsg, err
	}
	return userMsg, modelMsg, nil
}

func (h *Handler) streamTurn(c *fiber.Ctx, message string) error {
	if !acp.Available() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "gemini CLI not found. Please install: npm install -g @google/gemini-cli",
		})
	}

	dir := h.Dir()
	model := h.Model()

	before, err := checkpoint.Snapshot(dir)
	if err != nil {
		before = ""
	}

	ctx, cancel := context.WithCancel(context.Background())
	h.mu.Lock()
	h.cancelFunc = cancel
	h.mu.Unlock()

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no")

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		defer func() {
			h.mu.Lock()
			h.cancelFunc = nil
			h.mu.Unlock()
		}()

		send := func(v fiber.Map) {
			b, _ := json.Marshal(v)
			_, _ = fmt.Fprintf(w, "data: %s\n\n", b)
			_ = w.Flush()
		}

		if !acp.Default.HasWarm(dir, model) {
			send(fiber.Map{"type": "status", "phase": "starting"})
		}

		output, runErr := acp.Default.Prompt(ctx, dir, model, message, func(u acp.Update) {
			switch u.Kind {
			case "tool":
				send(fiber.Map{"type": "tool", "name": u.Tool})
			case "token":
				if u.Text != "" {
					send(fiber.Map{"type": "token", "text": u.Text})
				}
			}
		})

		if runErr != nil {
			send(fiber.Map{"type": "error", "error": runErr.Error()})
			return
		}

		userMsg, modelMsg, perr := h.persistTurn(dir, message, output, before)
		if perr != nil {
			send(fiber.Map{"type": "error", "error": perr.Error()})
			return
		}

		send(fiber.Map{
			"type":		"done",
			"user":		userMsg,
			"model":	modelMsg,
			"can_undo":	before != "",
		})
	})

	return nil
}

func (h *Handler) ChatStream(c *fiber.Ctx) error {
	var body chatRequest
	if err := c.BodyParser(&body); err != nil || body.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "message required"})
	}
	return h.streamTurn(c, body.Message)
}

func (h *Handler) ContinueStream(c *fiber.Ctx) error {
	var body chatRequest
	_ = c.BodyParser(&body)
	msg := strings.TrimSpace(body.Message)
	if msg == "" {
		msg = "Yes, please continue."
	}
	return h.streamTurn(c, msg)
}

func (h *Handler) Stop(c *fiber.Ctx) error {
	acp.Default.Cancel(h.Dir())
	h.mu.Lock()
	if h.cancelFunc != nil {
		h.cancelFunc()
		h.cancelFunc = nil
	}
	h.mu.Unlock()
	return c.JSON(fiber.Map{"ok": true})
}
