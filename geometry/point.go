package geometry

import (
	"github.com/nikitasmall/map-to-go/config"
	"gopkg.in/mgo.v2/bson"
)

type Pointer interface {
	Save() error
	Delete() error
	PrepareToMap() *MapObject
}

type MapObject struct {
	Type     string   `json:"type"`
	Id       string   `json:"id"`
	Geometry Geometry `json:"geometry"`
}

type Geometry struct {
	Type   string    `json:"type"`
	Coords []float64 `json:"coordinates"`
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

func GetPoints() (*Points, error) {
	session := config.Connect()
	pointsCollection := session.DB("mapToGo").C("points")

	var points Points
	err := pointsCollection.Find(nil).All(&points)
	session.Close()

	return &points, err
}

func (point *Point) Delete() error {
	session := config.Connect()
	pointsCollection := session.DB("mapToGo").C("points")

	err := pointsCollection.Remove(point)
	session.Close()

	return err
}

func (point *Point) Save() error {
	session := config.Connect()
	pointsCollection := session.DB("mapToGo").C("points")

	err := pointsCollection.Insert(point)
	session.Close()

	return err
}

func (point *Point) PrepareToMap() *MapObject {
	geometry := Geometry{
		Type:   "Point",
		Coords: []float64{point.Loc[1], point.Loc[0]},
	}

	return &MapObject{
		Type:     "Feature",
		Id:       point.Id,
		Geometry: geometry,
	}
}

func PointsArrayToMap(points *Points) []*MapObject {
	mapPoints := make([]*MapObject, 0)
	for _, point := range *points {
		mapPoints = append(mapPoints, point.PrepareToMap())
	}

	return mapPoints
}
