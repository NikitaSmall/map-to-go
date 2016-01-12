package router

import (
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/geometry"
	"github.com/nikitasmall/map-to-go/socket"
	"log"
	"net/http"
)

// function binds json input from request to passed point struct
func bindPoint(point *geometry.Point, c *gin.Context) {
	err := c.BindJSON(point)
	if err != nil {
		log.Panic("Error on point binding from json. ", err.Error())
	}
}

// function handles GET request and
// return all the points to map
func getPointsHandler(c *gin.Context) {
	points, err := geometry.GetPoints()
	if err != nil {
		log.Print("Error processing of getting points from collection. ", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
	} else {
		c.JSON(http.StatusOK, geometry.PointsArrayToMap(points))
	}
}

// function handles POST request and
// saves new point to collection
func addPointHandler(c *gin.Context) {
	point := geometry.CreatePoint()
	bindPoint(point, c)

	err := point.Save()
	if err != nil {
		log.Print("Error processing of saving point to collection. ", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
	} else {
		socket.MainHub.SendMessage(socket.PointAdded, point.PrepareToMap())
		c.JSON(http.StatusOK, point.PrepareToMap())
	}
}

// function handles PATCH request, defines address
// and save changes to collection
func setAddressPointHandler(c *gin.Context) {
	point := &geometry.Point{}
	bindPoint(point, c)

	err := point.UpdateAddress()
	if err != nil {
		log.Print("Error processing of updating point's address. ", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
	} else {
		socket.MainHub.SendMessage(socket.HintAdded, point.PrepareToMap())
		c.JSON(http.StatusOK, gin.H{"message": point.Address})
	}
}

// function handles DELETE request and
// deletes point from the collection
func deletePointHandler(c *gin.Context) {
	point := &geometry.Point{}
	bindPoint(point, c)

	err := point.Delete()
	if err != nil {
		log.Print("Error processing of point deletion from collection. ", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
	} else {
		socket.MainHub.SendMessage(socket.PointRemoved, point.PrepareToMap())
		c.JSON(http.StatusOK, gin.H{"message": "Point #" + point.Id + " removed"})
	}
}
