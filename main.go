package main

import "github.com/nikitasmall/map-to-go/router"

func main() {
	router := router.Router()
	router.Run(":3000")
}
