package config

import (
	"gopkg.in/mgo.v2"
	"log"
)

// function returns a session to mongoDB,
// connection string is hardcoded
func Connect() *mgo.Session {
	uri := Env["connectionUrl"]

	session, err := mgo.Dial(uri)
	if err != nil {
		log.Panic("Error on db connection! ", err.Error())
	}

	return session
}
