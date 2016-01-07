package router

import (
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/config"
	"net/http"
	"net/http/httptest"
	"testing"
)

func newIndexTestRouter() *gin.Engine {
	testRouter := gin.Default()
	config.SetupTemplates(testRouter, "../templates/")

	// copy of IndexHandler, but has other relative path for template
	testRouter.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, config.TemplateFullPath("../templates/", "index"), nil)
	})

	return testRouter
}

func TestIndexHandler(t *testing.T) {
	testRouter := newIndexTestRouter()

	w := httptest.NewRecorder()
	r, err := http.NewRequest("GET", "/", nil)

	if err != nil {
		t.Error("Cannot create new request! ", err.Error())
	}

	testRouter.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Error("Response has unexpected status code! ", w.Code)
	}

	if w.Body == nil {
		t.Error("Response shouldn't return empty body! ", w.Body)
	}
}
