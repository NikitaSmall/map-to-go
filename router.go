package main

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
)

func Router() *gin.Engine {
	router := gin.New()

	router.Use(gin.Logger())

	SetupTemplates(router)
	setupRoutes(router)

	return router
}

func setupRoutes(router *gin.Engine) {
	router.GET("/", indexHandler)
	router.POST("/point", addPointHandler)
}

func indexHandler(c *gin.Context) {
	c.HTML(http.StatusOK, TemplateFullPath("index", ""), nil)
}

func addPointHandler(c *gin.Context) {
	var point Point
	err := c.BindJSON(&point)
	if err != nil {
		panic(err)
	}
	fmt.Println(point)

	c.JSON(http.StatusOK, point)
}
