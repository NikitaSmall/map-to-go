package router

import (
	"github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/config"
)

func Router() *gin.Engine {
	router := gin.Default()

	config.SetupStaticFiles(router)
	config.SetupTemplates(router)

	setupRoutes(router)

	return router
}

func setupRoutes(router *gin.Engine) {
	router.GET("/", IndexHandler)
	router.POST("/points", AddPointHandler)
	router.GET("/points", GetPointsHandler)
}
