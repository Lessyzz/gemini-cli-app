package handlers

import (
	"gemini-cli-app/checkpoint"
	"gemini-cli-app/database"
	"gemini-cli-app/models"

	"github.com/gofiber/fiber/v2"
)

func (h *Handler) turnRange(msgID int) (from, to string, ok bool) {
	var m models.Message
	if err := database.DB.Where("id = ? AND role = ?", msgID, "model").First(&m).Error; err != nil {
		return "", "", false
	}
	from = m.CheckpointHash
	if from == "" {
		return "", "", false
	}

	to = m.CheckpointAfter
	return from, to, true
}

func (h *Handler) Changes(c *fiber.Ctx) error {
	msgID := c.QueryInt("msg", 0)
	from, to, ok := h.turnRange(msgID)
	if !ok {
		return c.JSON(fiber.Map{"changes": []checkpoint.Change{}})
	}
	changes, err := checkpoint.Diff(h.Dir(), from, to)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"changes": changes})
}

func (h *Handler) Diff(c *fiber.Ctx) error {
	msgID := c.QueryInt("msg", 0)
	path := c.Query("path")
	if path == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "path gerekli"})
	}
	from, to, ok := h.turnRange(msgID)
	if !ok {
		return c.JSON(fiber.Map{"diff": ""})
	}
	patch, err := checkpoint.FileDiff(h.Dir(), from, to, path)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"diff": patch})
}
