package socket

import (
	"encoding/json"
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/gorilla/websocket"
	"github.com/nikitasmall/map-to-go/note"
	"testing"
)

func createTestNote() *note.Note {
	note := note.CreateNote()
	note.Note = "test"

	return note
}

func TestNewHub(t *testing.T) {
	testHub := newHub()
	if !testHub.isEmpty() {
		t.Error("Created not empty hub: ", testHub)
	}
}

func TestNewClientRequest(t *testing.T) {
	testHub := newHub()
	go testHub.Run()

	testClient := CreateClient(&websocket.Conn{}, "main")
	testHub.Register(testClient)
	if testHub.count() != 1 {
		t.Error("Client was not registered!", testHub.count())
	}
}

func TestClientMessageRecieve(t *testing.T) {
	testHub := newHub()
	go testHub.Run()

	testClient := CreateClient(&websocket.Conn{}, "main")
	testHub.Register(testClient)

	testNote := createTestNote()
	testHub.SendMessage(HintAdded, testNote)

	message := <-testClient.send
	if message == nil {
		t.Error("message was not recieved by client! ", message)
	}

	var m SocketMessage
	json.Unmarshal(message, &m)

	if m.Message.(map[string]interface{})["note"] != testNote.Note {
		t.Error("wrong message shipped! message", m.Message)
	}
}

func TestMessageRecieveForFewClients(t *testing.T) {
	testHub := newHub()
	go testHub.Run()

	testClientOne := CreateClient(&websocket.Conn{}, "main")
	testClientTwo := CreateClient(&websocket.Conn{}, "main")
	testHub.Register(testClientOne)
	testHub.Register(testClientTwo)

	testNote := createTestNote()
	testHub.SendMessage(HintAdded, testNote)

	messageOne := <-testClientOne.send
	if messageOne == nil {
		t.Error("message was not recieved to client! ", messageOne)
	}

	messageTwo := <-testClientTwo.send
	if messageTwo == nil {
		t.Error("message was not recieved to client! ", messageTwo)
	}

	var mOne, mTwo SocketMessage
	json.Unmarshal(messageOne, &mOne)
	json.Unmarshal(messageTwo, &mTwo)

	if mOne.Message.(map[string]interface{})["note"] != mTwo.Message.(map[string]interface{})["note"] {
		t.Error("clients get different messages! ", mOne, mTwo)
	}
}

func TestMessageRecieveForGroupedClients(t *testing.T) {
	testHub := newHub()
	go testHub.Run()

	testClient := CreateClient(&websocket.Conn{}, "main")
	testClientOne := CreateClient(&websocket.Conn{}, "testGroup")
	testClientTwo := CreateClient(&websocket.Conn{}, "testGroup")

	testHub.Register(testClient)
	testHub.Register(testClientOne)
	testHub.Register(testClientTwo)

	testNote := createTestNote()
	testHub.SendMessageToGroup(HintAdded, testNote, "testGroup")

	messageOne := <-testClientOne.send
	if messageOne == nil {
		t.Error("message was not recieved to client! ", messageOne)
	}

	messageTwo := <-testClientTwo.send
	if messageTwo == nil {
		t.Error("message was not recieved to client! ", messageTwo)
	}

	var mOne, mTwo SocketMessage
	json.Unmarshal(messageOne, &mOne)
	json.Unmarshal(messageTwo, &mTwo)

	if mOne.Message.(map[string]interface{})["note"] != mTwo.Message.(map[string]interface{})["note"] {
		t.Error("clients get different messages! ", mOne, mTwo)
	}

	select {
	case emptyMessage, ok := <-testClient.send:
		if ok {
			t.Error("Ungrouped client recieved a message!", emptyMessage)
		} else {
			t.Error("Error occured with channel")
		}
	default:
		// no message at testClient channel and all is ok
	}

}

func TestRemoveClientFromHub(t *testing.T) {
	testHub := newHub()
	go testHub.Run()

	testClientOne := CreateClient(&websocket.Conn{}, "main")
	testClientTwo := CreateClient(&websocket.Conn{}, "main")

	testHub.Register(testClientOne)
	testHub.Register(testClientTwo)

	testHub.unregister <- testClientTwo

	testNote := createTestNote()
	testHub.SendMessage(HintAdded, testNote)

	messageOne := <-testClientOne.send
	if messageOne == nil {
		t.Error("message was not recieved to client! ", messageOne)
	}

	select {
	case message, ok := <-testClientTwo.send:
		if ok {
			t.Error("Ungrouped client recieved a message!", message)
		} else {
			// chan is closed by hub and this is ok
		}
	default:
		t.Error("Chan is ok but it is empty")
	}

}
