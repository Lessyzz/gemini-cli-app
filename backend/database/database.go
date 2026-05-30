package database

import (
	"log"
	"path/filepath"

	"gemini-cli-app/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Switch(workDir string) error {

	if DB != nil {
		if sqlDB, err := DB.DB(); err == nil {
			_ = sqlDB.Close()
		}
		DB = nil
	}

	dbPath := filepath.Join(workDir, ".ai_history.db")

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return err
	}

	if err := db.AutoMigrate(&models.Message{}); err != nil {
		return err
	}

	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(1)

	DB = db
	return nil
}

func Init(workDir string) {
	if err := Switch(workDir); err != nil {
		log.Fatalf("could not open database: %v", err)
	}
}
