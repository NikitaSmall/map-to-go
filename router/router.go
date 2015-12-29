package router

import (
	"github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/config"
	"github.com/nikitasmall/map-to-go/socket"
)

func Router() *gin.Engine {
	router := gin.Default()

	config.SetupStaticFiles(router)
	config.SetupTemplates(router)

	setupRoutes(router)
	go socket.MainHub.Run()

	return router
}

func setupRoutes(router *gin.Engine) {
	router.GET("/", IndexHandler)

	router.GET("/points", GetPointsHandler)
	router.POST("/points", AddPointHandler)
	router.PATCH("/points", SetAddressPointHandler)
	router.DELETE("/points", DeletePointHandler)

	router.GET("/hub", HubHandler)
}
