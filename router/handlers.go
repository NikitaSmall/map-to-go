package router

import (
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/nikitasmall/map-to-go/config"
	"github.com/nikitasmall/map-to-go/geometry"
	"net/http"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func HubHandler(c *gin.Context) {
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		panic(err)
		return
	}

	client := CreateClient(ws)
	hub.register <- client
	go client.readPump()
	client.writePump()
}

func IndexHandler(c *gin.Context) {
	c.HTML(http.StatusOK, config.TemplateFullPath("index", ""), nil)
}

func GetPointsHandler(c *gin.Context) {
	points, err := geometry.GetPoints()
	if err != nil {
		panic(err)
	}

	c.JSON(http.StatusOK, geometry.PointsArrayToMap(points))
}

func AddPointHandler(c *gin.Context) {
	point := geometry.CreatePoint()

	err := c.BindJSON(point)
	if err != nil {
		panic(err)
	}

	err = point.Save()
	if err != nil {
		panic(err)
	}
	hub.broadcast <- []byte("new point was added")
	c.JSON(http.StatusOK, point.PrepareToMap())
}

func DeletePointHandler(c *gin.Context) {
	point := &geometry.Point{}

	err := c.BindJSON(point)
	if err != nil {
		panic(err)
	}

	err = point.Delete()
	if err != nil {
		panic(err)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Point #" + point.Id + " removed"})
}
