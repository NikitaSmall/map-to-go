package router

import (
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/gorilla/websocket"
	"github.com/nikitasmall/map-to-go/socket"
)

// basic gorilla/websocket upgrader
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// function handles GET request and
// upgrades it to websocket connection
func hubHandler(c *gin.Context) {
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		panic(err)
		return
	}

	client := socket.CreateClient(ws, "main")
	socket.MainHub.Register(client)
	go client.ReadPump()
	client.WritePump()
}
