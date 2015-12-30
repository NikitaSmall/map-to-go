package geometry

import (
	"github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/config"
	"gopkg.in/mgo.v2/bson"
	"log"
)

// interface of generic geometrical object
type Pointer interface {
	Save() error
	Delete() error
	UpdateAddress() error
	PrepareToMap() *MapObject
	DefineAddress()
	BindPoint(c *gin.Context)
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
	Loc     []float64 `json:"loc" binding:"required"`
	Address string    `json:"address"`
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

// function binds json input to point struct
func (point *Point) BindPoint(c *gin.Context) {
	err := c.BindJSON(point)
	if err != nil {
		log.Panic("Error on point binding from json. ", err.Error())
	}
}

// function returns an array of all points
// that presented in mongoDB collection
func GetPoints() (*Points, error) {
	session := config.Connect()
	defer func() { session.Close() }()

	pointsCollection := session.DB("mapToGo").C("points")

	var points Points
	err := pointsCollection.Find(nil).All(&points)

	return &points, err
}

// function search an address
// and saves it to collection
func (point *Point) UpdateAddress() error {
	session := config.Connect()
	defer func() { session.Close() }()

	pointsCollection := session.DB("mapToGo").C("points")

	point.DefineAddress(GoogleGeocoder)
	err := pointsCollection.Update(bson.M{"_id": point.Id}, point)

	return err
}

// function deletes a point from collection
func (point *Point) Delete() error {
	session := config.Connect()
	defer func() { session.Close() }()

	pointsCollection := session.DB("mapToGo").C("points")

	err := pointsCollection.Remove(bson.M{"_id": point.Id})

	return err
}

// function saves a point to collection
func (point *Point) Save() error {
	session := config.Connect()
	defer func() { session.Close() }()

	pointsCollection := session.DB("mapToGo").C("points")

	err := pointsCollection.Insert(point)

	return err
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
