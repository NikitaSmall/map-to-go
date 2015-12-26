package main

import (
	"github.com/gin-gonic/gin"
)

func Router() *gin.Engine {
	router := gin.Default()

	SetupStaticFiles(router)
	SetupTemplates(router)
	setupRoutes(router)

	return router
}

func setupRoutes(router *gin.Engine) {
	router.GET("/", IndexHandler)
	router.POST("/points", AddPointHandler)
	router.GET("/points", GetPointsHandler)
}
