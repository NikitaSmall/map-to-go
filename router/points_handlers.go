package router

import (
	"github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/geometry"
	"github.com/nikitasmall/map-to-go/socket"
	// "log"
	"net/http"
)

func GetPointsHandler(c *gin.Context) {
	points, err := geometry.GetPoints()
	if err != nil {
		panic(err)
	}

	c.JSON(http.StatusOK, geometry.PointsArrayToMap(points))
}

func AddPointHandler(c *gin.Context) {
	point := geometry.CreatePoint()
	point.BindPoint(c)

	err := point.Save()
	if err != nil {
		panic(err)
	}

	socket.MainHub.SendMessage(socket.PointAdded, point.PrepareToMap())
	c.JSON(http.StatusOK, point.PrepareToMap())
}

func SetAddressPointHandler(c *gin.Context) {
	point := &geometry.Point{}
	point.BindPoint(c)

	err := point.UpdateAddress()
	if err != nil {
		panic(err)
	}

	socket.MainHub.SendMessage(socket.HintAdded, point.PrepareToMap())
	c.JSON(http.StatusOK, gin.H{"message": point.Address})
}

func DeletePointHandler(c *gin.Context) {
	point := &geometry.Point{}
	point.BindPoint(c)

	err := point.Delete()
	if err != nil {
		panic(err)
	}

	socket.MainHub.SendMessage(socket.PointRemoved, point.PrepareToMap())
	c.JSON(http.StatusOK, gin.H{"message": "Point #" + point.Id + " removed"})
}
