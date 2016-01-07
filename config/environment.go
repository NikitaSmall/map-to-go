package config

import (
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/vrischmann/envconfig"
	"log"
)

var conf struct {
	Mongolab struct {
		Uri string `envconfig:"default=localhost:27017"`
	}
	Port    string `envconfig:"default=3000"`
	DBName  string `envconfig:"default=mapToGo"`
	Session struct {
		Authentication struct {
			Key string `envconfig:"default=secret"`
		}
	}
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
		"dbName":        conf.DBName,
		"sessionKey":    conf.Session.Authentication.Key,
	}
}

// enviroment config
var Env = initializeConfig()
