package router

import (
	"github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/config"
	"github.com/nikitasmall/map-to-go/socket"
)

// function setups router configs and
// returns router that ready to be started
func Router() *gin.Engine {
	router := gin.Default()

	config.SetupStaticFiles(router)
	config.SetupTemplates(router, "templates/")

	setupRoutes(router)
	go socket.MainHub.Run()

	return router
}

// function setups routes to be handled
func setupRoutes(router *gin.Engine) {
	router.GET("/", IndexHandler)

	router.GET("/points", GetPointsHandler)
	router.POST("/points", AddPointHandler)
	router.PATCH("/points", SetAddressPointHandler)
	router.DELETE("/points", DeletePointHandler)

	router.GET("/hub", HubHandler)
}
