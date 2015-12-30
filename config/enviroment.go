package config

import (
	"github.com/vrischmann/envconfig"
	"log"
)

var conf struct {
	Mongolab struct {
		Uri string `envconfig:"default=localhost:27017"`
	}
	Port string `envconfig:"default=3000"`
}

// initialize config and turns it to map
func initializeConfig() map[string]string {
	err := envconfig.Init(&conf)
	if err != nil {
		log.Panic("Error on env config initialize! ", err.Error())
	}

	return map[string]string{
		"connectionUrl": conf.Mongolab.Uri,
		"port":          conf.Port,
	}
}

// enviroment config
var Env = initializeConfig()
