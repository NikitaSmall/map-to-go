package socket

import (
	"encoding/json"
	"log"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
}

func newHub() Hub {
	return Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

var MainHub = newHub()

func (hub *Hub) Register(client *Client) {
	hub.register <- client
}

func (hub *Hub) unregisterClient(c *Client) {
	if _, ok := hub.clients[c]; ok {
		delete(hub.clients, c)
		close(c.send)
	}
}

func (hub *Hub) isEmpty() bool {
	return len(hub.clients) == 0
}

func (hub *Hub) count() int {
	return len(hub.clients)
}

func (hub *Hub) SendMessage(action string, message interface{}) {
	if hub.isEmpty() {
		return
	}

	obj, err := json.Marshal(SocketMessage{Action: action, Message: message})
	if err != nil {
		log.Panic("Error on marchalising message. ", err.Error())
	}

	hub.broadcast <- obj
}

func (hub *Hub) broadcastMessage(m []byte) {
	for c := range hub.clients {
		select {
		case c.send <- m:
		default:
			close(c.send)
			delete(hub.clients, c)
		}
	}
}

func (hub *Hub) Run() {
	for {
		select {
		case c := <-hub.register:
			hub.clients[c] = true
		case c := <-hub.unregister:
			hub.unregisterClient(c)
			if hub.isEmpty() {
				HubManager.unregisterHub <- c.clientFor
				return
			}
		case m := <-hub.broadcast:
			hub.broadcastMessage(m)
		}
	}
}
