package models

import (
	"time"
)

type Message struct {
	ID		uint	`gorm:"primarykey" json:"id"`
	Role		string	`gorm:"not null" json:"role"`
	Content		string	`gorm:"type:text;not null" json:"content"`
	CheckpointHash	string	`json:"checkpoint_before"`
	CheckpointAfter	string	`json:"checkpoint_after"`

	AwaitingConfirmation	bool		`json:"awaiting_confirmation"`
	CreatedAt		time.Time	`json:"created_at"`
}
