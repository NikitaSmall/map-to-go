package router

import (
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/config"
	"net/http"
)

// function handles GET request to index page
// and returns a basic template
func indexHandler(c *gin.Context) {
	c.HTML(http.StatusOK, config.TemplateFullPath("templates/", "index"), nil)
}

func notFoundHandler(c *gin.Context) {
	c.Redirect(http.StatusMovedPermanently, "/")
}
