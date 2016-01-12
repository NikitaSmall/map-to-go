package router

import (
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/gin-gonic/gin"
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
	router.GET("/", indexHandler)
	router.NoRoute(notFoundHandler)

	router.GET("/points", getPointsHandler)
	router.POST("/search/points", searchPointsNearHandler)
	router.POST("/points", addPointHandler)
	router.PATCH("/points", setAddressPointHandler)
	router.DELETE("/points", deletePointHandler)

	router.GET("/notes/:pointId", getNotesHandler)
	router.POST("/notes", addNoteHandler)

	router.GET("/user", checkUser)
	router.POST("/register", register)
	router.POST("/login", login)
	router.DELETE("/logout", logout)

	router.GET("/hub", hubHandler)
}
