package config

import (
	"github.com/vrischmann/envconfig"
)

var conf struct {
	Mongolab struct {
		Uri string `envconfig:"default=localhost:27017"`
	}
}

func GetConnectionString() string {
	err := envconfig.Init(&conf)
	if err != nil {
		panic(err)
	}
	return conf.Mongolab.Uri
}
