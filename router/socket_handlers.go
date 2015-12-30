package router

import (
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/nikitasmall/map-to-go/socket"
)

// basic gorilla/websocket upgrader
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// function handles GET request and
// upgrades it to websocket connection
func HubHandler(c *gin.Context) {
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		panic(err)
		return
	}

	client := socket.CreateClient(ws)
	socket.MainHub.Register(client)
	go client.ReadPump()
	client.WritePump()
}
