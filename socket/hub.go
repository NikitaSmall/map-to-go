package socket

import (
	"encoding/json"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
}

var MainHub = Hub{
	clients:    make(map[*Client]bool),
	broadcast:  make(chan []byte),
	register:   make(chan *Client),
	unregister: make(chan *Client),
}

func (hub *Hub) Register(client *Client) {
	hub.register <- client
}

func (hub *Hub) SendMessage(action string, message interface{}) {
	obj, err := json.Marshal(&SocketMessage{Action: action, Message: message})
	if err != nil {
		panic(err)
	}

	hub.broadcast <- obj
}

func (hub *Hub) Run() {
	for {
		select {
		case c := <-hub.register:
			hub.clients[c] = true
		case c := <-hub.unregister:
			if _, ok := hub.clients[c]; ok {
				delete(hub.clients, c)
				close(c.send)
			}
		case m := <-hub.broadcast:
			for c := range hub.clients {
				select {
				case c.send <- m:
				default:
					close(c.send)
					delete(hub.clients, c)
				}
			}
		}
	}
}
