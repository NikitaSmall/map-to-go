package router

import (
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/geometry"
	"github.com/nikitasmall/map-to-go/note"
	"github.com/nikitasmall/map-to-go/socket"
	"log"
	"net/http"
)

// function binds json input from request to passed note struct
func bindNote(note *note.Note, c *gin.Context) {
	err := c.BindJSON(note)
	if err != nil {
		log.Panic("Error on note binding from json. ", err.Error())
	}

	note.Author, _ = getSessionUser(c)
}

// handler function makes attempt to create a new note
// and add it to point
// if successfull, send note to all clients in the group (in point)
func addNoteHandler(c *gin.Context) {
	note := note.CreateNote()
	bindNote(note, c)

	point, err := geometry.GetPoint(note.PointId)
	if err != nil {
		log.Panic("Cannot get access to point! ", err.Error())
	}

	err = point.AddNote(note)
	if err != nil {
		log.Print("Error processing of saving note to point: ", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
	} else {
		socket.MainHub.SendMessageToGroup(socket.NoteAdded, note, point.Id)
		c.JSON(http.StatusOK, note)
	}
}

func getNotesHandler(c *gin.Context) {
	pointId := c.Param("pointId")

	point, err := geometry.GetPoint(pointId)
	if err != nil {
		log.Print("Error processing of retrieving notes from point: ", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
	} else {
		c.JSON(http.StatusOK, point.Notes)
	}
}
