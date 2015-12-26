package main

import (
	"gopkg.in/mgo.v2/bson"
)

type Pointer interface {
	Save() error
}

type Point struct {
	Id string `json:"id" bson:"_id,omitempty"`
	// [longitude, latitude]
	Loc []float64 `json:"loc" binding:"required"`
}

type Points []Point

func CreatePoint() *Point {
	return &Point{
		Id: bson.NewObjectId().Hex(),
	}
}

func (point *Point) Save() error {
	session := Connect()
	pointsCollection := session.DB("mapToGo").C("points")

	err := pointsCollection.Insert(point)
	session.Close()

	return err
}

func GetPoints() (*Points, error) {
	session := Connect()
	pointsCollection := session.DB("mapToGo").C("points")

	var points Points
	err := pointsCollection.Find(nil).All(&points)

	session.Close()

	return &points, err
}
