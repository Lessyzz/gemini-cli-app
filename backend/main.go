package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"gemini-cli-app/acp"
	"gemini-cli-app/database"
	"gemini-cli-app/handlers"
	"gemini-cli-app/registry"
	"gemini-cli-app/util"
	"gemini-cli-app/web"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

const serverAddr = ":8080"
const serverURL = "http://localhost:8080"

func main() {

	workDir, err := os.Getwd()
	if err != nil {
		log.Fatalf("could not get working directory: %v", err)
	}

	database.Init(workDir)
	registry.Touch(workDir)

	go func() {
		if home, herr := os.UserHomeDir(); herr == nil {
			registry.Import(home)
		}
	}()

	app := fiber.New(fiber.Config{
		AppName:               "Gemini CLI App",
		DisableStartupMessage: true,
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept",
		AllowMethods: "GET,POST,DELETE",
	}))

	h := handlers.New(workDir)

	api := app.Group("/api")
	api.Get("/status", h.Status)
	api.Get("/chat", h.History)
	api.Post("/chat", h.Chat)
	api.Post("/chat/stream", h.ChatStream)
	api.Post("/continue", h.Continue)
	api.Post("/continue/stream", h.ContinueStream)
	api.Post("/stop", h.Stop)
	api.Post("/restore", h.Restore)
	api.Get("/state", h.State)
	api.Get("/project", h.Project)
	api.Post("/project", h.SetProject)
	api.Get("/projects", h.Projects)
	api.Delete("/projects", h.DeleteProject)
	api.Get("/browse", h.Browse)
	api.Get("/files", h.ReadFile)
	api.Post("/files", h.WriteFile)
	api.Post("/files/rename", h.RenameFile)
	api.Delete("/files", h.DeleteFile)
	api.Get("/changes", h.Changes)
	api.Get("/diff", h.Diff)
	api.Get("/quota", h.Quota)
	api.Get("/model", h.GetModel)
	api.Post("/model", h.SetModel)

	if err := web.Register(app); err != nil {
		log.Fatalf("could not load static files: %v", err)
	}

	go func() {
		time.Sleep(500 * time.Millisecond)
		util.OpenBrowser(serverURL)
	}()

	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		acp.Default.CloseAll()
		_ = app.Shutdown()
		os.Exit(0)
	}()

	log.Printf("✓ Gemini CLI App Ready → %s", serverURL)
	log.Printf("✓ Made by lessy")
	if err := app.Listen(serverAddr); err != nil {
		log.Fatalf("could not start server: %v", err)
	}
}
