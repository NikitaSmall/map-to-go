package note

import (
	"github.com/nikitasmall/map-to-go/config"
	"gopkg.in/mgo.v2/bson"
	"time"
)

type Noter interface {
	Save() error
	Delete() error
}

type Note struct {
	Id        string `json:"id" bson:"_id,omitempty"`
	Author    string `json:"author"`
	Note      string `json:"note" binding:"required"`
	PointId   string `json:"pointId" binging:"required"`
	CreatedAt string `json:"createdAt"`
}

func CreateNote() *Note {
	return &Note{
		Id:        bson.NewObjectId().Hex(),
		Author:    "",
		Note:      "",
		CreatedAt: time.Now().String(),
	}
}

func (note *Note) Save() error {
	session := config.Connect()
	defer func() { session.Close() }()

	notesCollection := session.DB("mapToGo").C("notes")
	return notesCollection.Insert(note)
}
