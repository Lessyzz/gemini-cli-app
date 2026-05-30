package handlers

import (
	"os"
	"path/filepath"
	"sort"

	"gemini-cli-app/acp"
	"gemini-cli-app/database"
	"gemini-cli-app/registry"

	"github.com/gofiber/fiber/v2"
)

func (h *Handler) Project(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"project":		h.Dir(),
		"cli_available":	acp.Available(),
	})
}

type setProjectRequest struct {
	Path string `json:"path"`
}

func (h *Handler) SetProject(c *fiber.Ctx) error {
	var body setProjectRequest
	if err := c.BodyParser(&body); err != nil || body.Path == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "path gerekli"})
	}

	info, err := os.Stat(body.Path)
	if err != nil || !info.IsDir() {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "not a valid directory"})
	}

	abs, err := filepath.Abs(body.Path)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if err := database.Switch(abs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "could not connect to database: " + err.Error(),
		})
	}

	h.setDir(abs)
	h.setCurrent("")
	registry.Register(abs)

	return c.JSON(fiber.Map{
		"project":		abs,
		"cli_available":	acp.Available(),
	})
}

func (h *Handler) Projects(c *fiber.Ctx) error {
	return c.JSON(registry.List())
}

func (h *Handler) DeleteProject(c *fiber.Ctx) error {
	path := c.Query("path")
	if path == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "path gerekli"})
	}
	if path == h.Dir() {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "active chat cannot be deleted, switch to another directory first",
		})
	}

	acp.Default.Close(path)
	registry.Remove(path)
	_ = os.Remove(filepath.Join(path, ".ai_history.db"))
	_ = os.RemoveAll(filepath.Join(path, ".ai_checkpoints"))

	return c.JSON(fiber.Map{"ok": true})
}

type browseEntry struct {
	Name	string	`json:"name"`
	Path	string	`json:"path"`
	IsDir	bool	`json:"is_dir"`
}

func (h *Handler) Browse(c *fiber.Ctx) error {
	path := c.Query("path")
	includeFiles := c.Query("files") == "true"

	if path == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			home = "/"
		}
		path = home
	}

	abs, err := filepath.Abs(path)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	entries, err := os.ReadDir(abs)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "could not read directory: " + err.Error(),
		})
	}

	var results []browseEntry
	for _, e := range entries {
		name := e.Name()

		if len(name) > 0 && name[0] == '.' {
			continue
		}

		isDir := e.IsDir()
		if !isDir && !includeFiles {
			continue
		}

		results = append(results, browseEntry{
			Name:	name,
			Path:	filepath.Join(abs, name),
			IsDir:	isDir,
		})
	}
	sort.Slice(results, func(i, j int) bool {

		if results[i].IsDir != results[j].IsDir {
			return results[i].IsDir
		}
		return results[i].Name < results[j].Name
	})

	parent := filepath.Dir(abs)
	if parent == abs {
		parent = ""
	}

	var legacyDirs []browseEntry
	for _, r := range results {
		if r.IsDir {
			legacyDirs = append(legacyDirs, r)
		}
	}

	return c.JSON(fiber.Map{
		"current":	abs,
		"parent":	parent,
		"entries":	results,
		"dirs":		legacyDirs,
	})
}
