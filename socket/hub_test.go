package socket

import (
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

var TestHub = newHub()

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func newHubTestRouter() *gin.Engine {
	testRouter := gin.Default()

	go TestHub.Run()

	testRouter.GET("/hub", func(c *gin.Context) {
		ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			panic(err)
			return
		}

		client := CreateClient(ws, "main")
		TestHub.Register(client)
		go client.ReadPump()
		go client.WritePump()

		time.Sleep(5 * time.Second)
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	return testRouter
}

func TestNewHub(t *testing.T) {
	testHub := newHub()
	if !testHub.isEmpty() {
		t.Error("Created not empty hub: ", testHub)
	}
}

func TestNewClientRequest(t *testing.T) {
	w := httptest.NewRecorder()
	r, err := http.NewRequest("GET", "/hub", nil)

	if err != nil {
		t.Error("Cannot create new request! ", err.Error())
	}

	testHubRouter := newHubTestRouter()
	testHubRouter.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Error("Response has unexpected status code! ", w.Code)
	}

	if w.Body == nil {
		t.Error("Response shouldn't return empty body! ", w.Body)
	}
}
