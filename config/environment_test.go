package config

import (
	"os"
	"testing"
)

func TestEnvironmentDefaultValues(t *testing.T) {
	defaultEnv := initializeConfig()

	if defaultEnv["port"] != "3000" {
		t.Error("Wrong port default env! ", defaultEnv["port"])
	}

	if defaultEnv["connectionUrl"] != "localhost:27017" {
		t.Error("Wrong connectionUrl default env! ", defaultEnv["connectionUrl"])
	}
}

func TestEnvironmentCustomValues(t *testing.T) {
	os.Setenv("PORT", "80")
	os.Setenv("MONGOLAB_URI", "http://custom.com")

	customEnv := initializeConfig()
	if customEnv["port"] != "80" {
		t.Error("Wrong port env! ", customEnv["port"])
	}

	if customEnv["connectionUrl"] != "http://custom.com" {
		t.Error("Wrong connectionUrl env! ", customEnv["connectionUrl"])
	}
}
