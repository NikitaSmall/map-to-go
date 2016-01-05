package socket

import (
	"github.com/gorilla/websocket"
	"github.com/nikitasmall/map-to-go/note"
	"testing"
)

func TestNewHub(t *testing.T) {
	testHub := newHub()
	if !testHub.isEmpty() {
		t.Error("Created not empty hub: ", testHub)
	}
}

func TestNewClientRequest(t *testing.T) {
	testClient := CreateClient(&websocket.Conn{}, "main")
	testHub := newHub()

	go testHub.Run()

	testHub.Register(testClient)
	if testHub.count() != 1 {
		t.Error("Client was not registered!", testHub.count())
	}
}

func TestClientMessageRecieve(t *testing.T) {
	testClient := CreateClient(&websocket.Conn{}, "main")
	go testClient.ReadPump()
	go testClient.WritePump()
	note := note.CreateNote()

	note.Note = "test"

	testHub := newHub()

	go testHub.Run()
	testHub.Register(testClient)

	testHub.SendMessage(HintAdded, note)

	if message := <-testClient.send; message != nil {
		t.Error("message was not recieved by client! ", message)
	}
}
