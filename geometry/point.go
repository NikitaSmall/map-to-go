package geometry

import (
	"github.com/nikitasmall/map-to-go/config"
	"github.com/nikitasmall/map-to-go/note"
	"gopkg.in/mgo.v2/bson"
)

// interface of generic geometrical object
type Pointer interface {
	Save() error
	Delete() error
	UpdateAddress() error
	PrepareToMap() *MapObject
	DefineAddress()

	AddNote(note note.Note) error
}

// struct created to be passed to
// yandex map's object manager
type MapObject struct {
	Type       string     `json:"type"`
	Id         string     `json:"id"`
	Geometry   Geometry   `json:"geometry"`
	Properties Properties `json:"properties"`
}

// base struct for MapObject
// provided type (point, circle etc.)
// and coordinates
// (they will be reversed for ya objectManager)
type Geometry struct {
	Type   string    `json:"type"`
	Coords []float64 `json:"coordinates"`
}

// info properties for MapObject
type Properties struct {
	BallonContent string `json:"balloonContent"`
	HintContent   string `json:"hintContent"`
}

// base point for yandex map
// note, that coordinates stored in other order
// than presented on map
type Point struct {
	Id string `json:"id" bson:"_id,omitempty"`
	// [longitude, latitude]
	Loc     []float64  `json:"loc" binding:"required"`
	Address string     `json:"address"`
	Notes   note.Notes `json:"notes"`
}

// array of points for objectManager startup
type Points []Point

// function creates a new point with uniq ID
// and empty address field
func CreatePoint() *Point {
	return &Point{
		Id:      bson.NewObjectId().Hex(),
		Address: "",
	}
}

// function returns point with provided id
func GetPoint(pointId string) (*Point, error) {
	session := config.Connect()
	defer session.Close()

	pointsCollection := session.DB("mapToGo").C("points")

	var point Point
	err := pointsCollection.FindId(pointId).One(&point)

	return &point, err
}

// function returns an array of all points
// that presented in mongoDB collection
func GetPoints() (*Points, error) {
	session := config.Connect()
	defer session.Close()

	pointsCollection := session.DB("mapToGo").C("points")

	var points Points
	err := pointsCollection.Find(nil).All(&points)

	return &points, err
}

// function search an address
// and saves it to specific point
// inside the points collection
func (point *Point) UpdateAddress() error {
	session := config.Connect()
	defer session.Close()

	pointsCollection := session.DB("mapToGo").C("points")

	point.DefineAddress(GoogleGeocoder)
	return pointsCollection.Update(bson.M{"_id": point.Id}, bson.M{"$set": bson.M{"address": point.Address}})
}

// function saves new note into array inside of point
func (point *Point) AddNote(note *note.Note) error {
	session := config.Connect()
	defer session.Close()

	pointsCollection := session.DB("mapToGo").C("points")

	note.SanitizeContent()
	return pointsCollection.Update(bson.M{"_id": point.Id}, bson.M{"$push": bson.M{"notes": note}})
}

// function deletes a point from collection
func (point *Point) Delete() error {
	session := config.Connect()
	defer session.Close()

	pointsCollection := session.DB("mapToGo").C("points")

	return pointsCollection.Remove(bson.M{"_id": point.Id})
}

// function saves a new point to collection
func (point *Point) Save() error {
	session := config.Connect()
	defer session.Close()

	pointsCollection := session.DB("mapToGo").C("points")

	return pointsCollection.Insert(point)
}

// function makes preparations to present point on the map
// returns assempled mapObject from point properties
func (point *Point) PrepareToMap() *MapObject {
	geometry := Geometry{
		Type:   "Point",
		Coords: []float64{point.Loc[1], point.Loc[0]},
	}

	properties := Properties{
		BallonContent: "Wait for data...",
		HintContent:   point.Address,
	}

	return &MapObject{
		Type:       "Feature",
		Id:         point.Id,
		Geometry:   geometry,
		Properties: properties,
	}
}

// function takes a slice of points and
// returns slice of mapObjects
func PointsArrayToMap(points *Points) []*MapObject {
	mapPoints := make([]*MapObject, 0)
	for _, point := range *points {
		mapPoints = append(mapPoints, point.PrepareToMap())
	}

	return mapPoints
}
