package config

import (
	"gopkg.in/mgo.v2"
)

// function returns a session to mongoDB,
// connection string is hardcoded
func Connect() *mgo.Session {
	uri := Env["connectionUrl"]

	session, err := mgo.Dial(uri)
	if err != nil {
		panic(err)
	}

	return session
}
