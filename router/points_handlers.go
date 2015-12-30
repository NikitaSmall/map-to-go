package router

import (
	"github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/geometry"
	"github.com/nikitasmall/map-to-go/socket"
	"log"
	"net/http"
)

// function handles GET request and
// return all the points to map
func GetPointsHandler(c *gin.Context) {
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
func AddPointHandler(c *gin.Context) {
	point := geometry.CreatePoint()
	point.BindPoint(c)

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
func SetAddressPointHandler(c *gin.Context) {
	point := &geometry.Point{}
	point.BindPoint(c)

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
func DeletePointHandler(c *gin.Context) {
	point := &geometry.Point{}
	point.BindPoint(c)

	err := point.Delete()
	if err != nil {
		log.Print("Error processing of point deletion from collection. ", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
	} else {
		socket.MainHub.SendMessage(socket.PointRemoved, point.PrepareToMap())
		c.JSON(http.StatusOK, gin.H{"message": "Point #" + point.Id + " removed"})
	}
}