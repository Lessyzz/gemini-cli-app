package handlers

import "github.com/gofiber/fiber/v2"

func (h *Handler) GetModel(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"model": h.Model()})
}

type setModelRequest struct {
	Model string `json:"model"`
}

func (h *Handler) SetModel(c *fiber.Ctx) error {
	var body setModelRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "model gerekli"})
	}

	h.setModel(body.Model)
	return c.JSON(fiber.Map{"model": h.Model()})
}
