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
	go hub.run()

	return router
}

func setupRoutes(router *gin.Engine) {
	router.GET("/", IndexHandler)

	router.GET("/points", GetPointsHandler)
	router.POST("/points", AddPointHandler)
	router.DELETE("/points", DeletePointHandler)

	router.GET("/hub", HubHandler)
}
