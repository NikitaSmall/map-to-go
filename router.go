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
	router.GET("/", indexHandler)
	router.POST("/points", addPointHandler)
	router.GET("/points", getPointsHandler)
}

func indexHandler(c *gin.Context) {
	c.HTML(http.StatusOK, TemplateFullPath("index", ""), nil)
}

func addPointHandler(c *gin.Context) {
	point := CreatePoint()

	err := c.BindJSON(point)
	if err != nil {
		panic(err)
	}

	err = point.Save()
	if err != nil {
		panic(err)
	}

	c.JSON(http.StatusOK, point)
}

func getPointsHandler(c *gin.Context) {
	points, err := GetPoints()
	if err != nil {
		panic(err)
	}

	c.JSON(http.StatusOK, points)
}
