package socket

import (
	"encoding/json"
	"log"
)

// simple hub that manages all the socket connections as a clients
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	toGroup    chan *groupMessage
}

// simple message struct that may be sended to a specific group
type groupMessage struct {
	GroupId string
	Message []byte
}

// creates message that could be delivered to a group of clients
func newGroupMessage(groupId string, message []byte) *groupMessage {
	return &groupMessage{
		GroupId: groupId,
		Message: message,
	}
}

// creates a hub
func newHub() Hub {
	return Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		toGroup:    make(chan *groupMessage),
	}
}

// main hub of this app. To send something to a client use this hub
var MainHub = newHub()

// function registers new client to a hub
func (hub *Hub) Register(client *Client) {
	hub.register <- client
}

// function removes a client from a hub
func (hub *Hub) unregisterClient(c *Client) {
	if _, ok := hub.clients[c]; ok {
		delete(hub.clients, c)
		close(c.send)
	}
}

// function checks is hub empty
func (hub *Hub) isEmpty() bool {
	return len(hub.clients) == 0
}

// function returns number of clients in a hub
func (hub *Hub) count() int {
	return len(hub.clients)
}

// function makes preparations to broadcast message to all clients
// if there are clients in a hub
func (hub *Hub) SendMessage(action string, message interface{}) {
	if hub.isEmpty() {
		return
	}

	obj := prepareMessage(action, message)
	hub.broadcast <- obj
}

// function makes preparations to broadcast message to group of clients
// if there are clients in a hub
func (hub *Hub) SendMessageToGroup(action string, message interface{}, groupId string) {
	if hub.isEmpty() {
		return
	}

	obj := prepareMessage(action, message)
	hub.toGroup <- newGroupMessage(groupId, obj)
}

// helper function returns prepared message
// that contains the message itself and action description
func prepareMessage(action string, message interface{}) []byte {
	obj, err := json.Marshal(SocketMessage{Action: action, Message: message})
	if err != nil {
		log.Panic("Error on marchalising message. ", err.Error())
	}

	return obj
}

// main hub process
func (hub *Hub) Run() {
	for {
		select {
		case c := <-hub.register:
			hub.clients[c] = true
		case c := <-hub.unregister:
			hub.unregisterClient(c)
		case m := <-hub.broadcast:
			hub.broadcastMessage(m)
		case gm := <-hub.toGroup: // gm means group message
			hub.broadcastToGroup(gm)
		}
	}
}

// function broadcasts prepared message to all the clients in the hub
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

// function broadcasts prepared message to the group of clients in the hub
func (hub *Hub) broadcastToGroup(gm *groupMessage) {
	for c := range hub.clients {
		if c.GroupId == gm.GroupId {
			select {
			case c.send <- gm.Message:
			default:
				close(c.send)
				delete(hub.clients, c)
			}
		}
	}
}
