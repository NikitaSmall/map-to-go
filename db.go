package main

import (
	"gopkg.in/mgo.v2"
)

func Connect() *mgo.Session {
	session, err := mgo.Dial("localhost:27017")
	if err != nil {
		panic(err)
	}

	return session
}
