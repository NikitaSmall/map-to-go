package main

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

func Router() *gin.Engine {
	router := gin.Default()

	SetupTemplates(router)
	setupRoutes(router)

	return router
}

func setupRoutes(router *gin.Engine) {
	router.GET("/", handler)
}

func handler(c *gin.Context) {
	c.HTML(http.StatusOK, TemplateFullPath("index", ""), nil)
}
