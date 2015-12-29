package main

import (
	"github.com/nikitasmall/map-to-go/config"
	"github.com/nikitasmall/map-to-go/router"
)

func main() {
	port := config.Env["port"]

	router := router.Router()
	router.Run(":" + port)
}
