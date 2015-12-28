package router

import (
	"github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/config"
	"net/http"
)

func IndexHandler(c *gin.Context) {
	c.HTML(http.StatusOK, config.TemplateFullPath("index", ""), nil)
}
