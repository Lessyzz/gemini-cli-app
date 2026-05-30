package handlers

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type fileRequest struct {
	Path	string	`json:"path"`
	Content	string	`json:"content"`
}

func (h *Handler) ReadFile(c *fiber.Ctx) error {
	path := c.Query("path")
	if path == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "path gerekli"})
	}

	abs, err := filepath.Abs(path)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	content, err := os.ReadFile(abs)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not read file: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"path":		abs,
		"content":	string(content),
	})
}

func (h *Handler) WriteFile(c *fiber.Ctx) error {
	var body fileRequest
	if err := c.BodyParser(&body); err != nil || body.Path == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	abs, err := filepath.Abs(body.Path)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	dir := filepath.Dir(abs)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not create directory: " + err.Error()})
	}

	if err := os.WriteFile(abs, []byte(body.Content), 0644); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not write file: " + err.Error()})
	}

	return c.JSON(fiber.Map{"ok": true, "path": abs})
}

func (h *Handler) RenameFile(c *fiber.Ctx) error {
	type renameRequest struct {
		OldPath	string	`json:"oldPath"`
		NewPath	string	`json:"newPath"`
	}
	var body renameRequest
	if err := c.BodyParser(&body); err != nil || body.OldPath == "" || body.NewPath == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	oldAbs, err := filepath.Abs(body.OldPath)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	newAbs, err := filepath.Abs(body.NewPath)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if err := os.Rename(oldAbs, newAbs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not rename: " + err.Error()})
	}

	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handler) DeleteFile(c *fiber.Ctx) error {
	path := c.Query("path")
	if path == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "path gerekli"})
	}

	abs, err := filepath.Abs(path)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if strings.HasSuffix(abs, ".ai_history.db") || strings.Contains(abs, ".ai_checkpoints") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "bu dosya buradan silinemez"})
	}

	if err := os.RemoveAll(abs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "silinemedi: " + err.Error()})
	}

	return c.JSON(fiber.Map{"ok": true})
}
