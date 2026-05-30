package handlers

import (
	"gemini-cli-app/quota"

	"github.com/gofiber/fiber/v2"
)

func (h *Handler) Quota(c *fiber.Ctx) error {
	result, err := quota.Get()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(result)
}
