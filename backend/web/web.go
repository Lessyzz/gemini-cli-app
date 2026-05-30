package web

import (
	"embed"
	"io/fs"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
)

var distFS embed.FS

func Register(app *fiber.App) error {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		return err
	}

	app.Use("/", filesystem.New(filesystem.Config{
		Root:		http.FS(sub),
		Index:		"index.html",
		NotFoundFile:	"index.html",
	}))

	return nil
}
