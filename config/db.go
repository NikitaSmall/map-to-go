package config

import (
	"gopkg.in/mgo.v2"
)

func Connect() *mgo.Session {
	uri := GetConnectionString()

	session, err := mgo.Dial(uri)
	if err != nil {
		panic(err)
	}

	return session
}
