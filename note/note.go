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

type Notes []Note

func CreateNote() *Note {
	return &Note{
		Id:        bson.NewObjectId().Hex(),
		Author:    "",
		Note:      "",
		CreatedAt: time.Now().String(),
	}
}

// function save new note to collection
func (note *Note) Save() error {
	session := config.Connect()
	defer func() { session.Close() }()

	notesCollection := session.DB("mapToGo").C("notes")
	return notesCollection.Insert(note)
}

// function returns all notes that binded to some point
func GetNotes(pointId string) (*Notes, error) {
	session := config.Connect()
	defer func() { session.Close() }()
	notesCollection := session.DB("mapToGo").C("notes")

	var notes Notes
	err := notesCollection.Find(bson.M{"pointid": pointId}).Sort("+createdat").All(&notes)

	return &notes, err
}
