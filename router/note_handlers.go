package router

import (
	"github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/note"
	"log"
	"net/http"
)

// function binds json input from request to passed note struct
func bindNote(note *note.Note, c *gin.Context) {
	err := c.BindJSON(note)
	if err != nil {
		log.Panic("Error on note binding from json. ", err.Error())
	}
}

func addNoteHandler(c *gin.Context) {
	note := note.CreateNote()
	bindNote(note, c)

	err := note.Save()
	if err != nil {
		log.Print("Error processing of saving note to collection. ", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
	} else {
		c.JSON(http.StatusOK, note)
	}
}

func getNotesHandler(c *gin.Context) {
	pointId := c.Param("pointId")

	notes, err := note.GetNotes(pointId)
	if err != nil {
		log.Print("Error processing of retrieving notes from collection. ", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
	} else {
		c.JSON(http.StatusOK, notes)
	}
}
