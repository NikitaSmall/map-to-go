package note

import (
	"gopkg.in/mgo.v2/bson"
	"time"
)

type Noter interface {
	SanitizeContent()
}

type Note struct {
	Id        string `json:"id" bson:"_id,omitempty"`
	Author    string `json:"author"`
	Note      string `json:"note" binding:"required"`
	PointId   string `json:"pointId" binging:"required"`
	CreatedAt string `json:"createdAt"`
}

type Notes []Note

func CreateNote() *Note {
	return &Note{
		Id:        bson.NewObjectId().Hex(),
		Author:    "",
		Note:      "",
		CreatedAt: time.Now().Format("2006-01-02 15:04:05"),
	}
}

func (note *Note) SanitizeContent() {
	note.Author = sanitizeString(note.Author)
	note.Note = sanitizeString(note.Note)
}
