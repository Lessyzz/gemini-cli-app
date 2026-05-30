package handlers

import (
	"context"
	"sync"

	"gemini-cli-app/acp"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	mu		sync.RWMutex
	projectDir	string
	currentHash	string
	model		string
	cancelFunc	context.CancelFunc
}

func New(projectDir string) *Handler {
	return &Handler{projectDir: projectDir}
}

func (h *Handler) Model() string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.model
}

func (h *Handler) setModel(m string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.model = m
}

func (h *Handler) current() string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.currentHash
}

func (h *Handler) setCurrent(hash string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.currentHash = hash
}

func (h *Handler) Dir() string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.projectDir
}

func (h *Handler) setDir(dir string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.projectDir = dir
}

func (h *Handler) Status(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"cli_available":	acp.Available(),
		"project":		h.Dir(),
	})
}
