package handlers

import (
	"gemini-cli-app/checkpoint"
	"gemini-cli-app/database"
	"gemini-cli-app/models"

	"github.com/gofiber/fiber/v2"
)

type restoreRequest struct {
	Hash string `json:"hash"`
}

func (h *Handler) Restore(c *fiber.Ctx) error {
	var body restoreRequest
	if err := c.BodyParser(&body); err != nil || body.Hash == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "hash gerekli"})
	}

	if err := checkpoint.Restore(h.Dir(), body.Hash); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var target models.Message
	if err := database.DB.Where("checkpoint_after = ?", body.Hash).Order("id desc").First(&target).Error; err == nil {

		database.DB.Where("id > ?", target.ID).Delete(&models.Message{})
	} else if err := database.DB.Where("checkpoint_before = ?", body.Hash).Order("id asc").First(&target).Error; err == nil {

		database.DB.Where("id >= ?", target.ID-1).Delete(&models.Message{})
	} else {

	}

	h.setCurrent(body.Hash)
	return c.JSON(fiber.Map{"current_hash": body.Hash})
}

func (h *Handler) State(c *fiber.Ctx) error {
	cur := h.current()
	if cur == "" {
		var last models.Message
		if err := database.DB.Where("role = ? AND checkpoint_after <> ?", "model", "").
			Order("id desc").First(&last).Error; err == nil {
			cur = last.CheckpointAfter
		}
	}
	return c.JSON(fiber.Map{"current_hash": cur})
}
