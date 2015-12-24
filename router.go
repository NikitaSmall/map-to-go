package main

import (
	"github.com/gin-gonic/gin"
	//"html/template"
	"net/http"
)

func Router() *gin.Engine {
	router := gin.Default()
	SetupTemplates(router)

	router.GET("/", handler)

	return router
}

func handler(c *gin.Context) {
	c.HTML(http.StatusOK, TemplateFullPath("index", ""), gin.H{"message": "Hola!"})
}
