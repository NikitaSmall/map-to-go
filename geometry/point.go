package geometry

import (
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/gopkg.in/mgo.v2"
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/gopkg.in/mgo.v2/bson"
	"github.com/nikitasmall/map-to-go/config"
	"github.com/nikitasmall/map-to-go/note"
	"log"
)

// configs for connection
var databaseName = config.Env["dbName"]
var collectionName = "points"

// interface of generic geometrical object
type Pointer interface {
	Save() error
	Delete() error
	PrepareToMap() *MapObject
	SearchNear(distance int) Points

	defineAddress()
	UpdateAddress() error

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
	Loc     GeoJson    `json:"loc" binding:"required"`
	Address string     `json:"address"`
	Notes   note.Notes `json:"notes"`
}

type GeoJson struct {
	Type string `json:"-"`
	// [longitude, latitude]
	Coordinates []float64 `json:"coordinates"`
}

// array of points for objectManager startup
type Points []Point

// setup the index for points
func init() {
	session := config.Connect()
	defer session.Close()

	pointsCollection := session.DB(databaseName).C(collectionName)

	locIndex := mgo.Index{
		Key:  []string{"$2dsphere:loc"},
		Bits: 26,
	}
	err := pointsCollection.EnsureIndex(locIndex)
	if err != nil {
		log.Print("Error on loc index setup: ", err.Error())
	}
}

// function creates a new point with uniq ID
// and empty address field
func CreatePoint() *Point {
	return &Point{
		Id:      bson.NewObjectId().Hex(),
		Address: "",
		Loc: GeoJson{
			Type: "Point",
		},
	}
}

// function returns point with provided id
func GetPoint(pointId string) (*Point, error) {
	session := config.Connect()
	defer session.Close()

	pointsCollection := session.DB(databaseName).C(collectionName)

	var point Point
	err := pointsCollection.FindId(pointId).One(&point)

	return &point, err
}

// function returns an array of all points
// that presented in mongoDB collection
func GetPoints() (*Points, error) {
	session := config.Connect()
	defer session.Close()

	pointsCollection := session.DB(databaseName).C(collectionName)

	var points Points
	err := pointsCollection.Find(nil).All(&points)

	return &points, err
}

func (p *Point) SearchNear(distance int) (*Points, error) {
	session := config.Connect()
	defer session.Close()

	pointsCollection := session.DB(databaseName).C(collectionName)

	var points Points
	err := pointsCollection.Find(bson.M{"loc": bson.M{"$near": bson.M{"$geometry": p.Loc, "$maxDistance": distance * 10}}}).All(&points)

	return &points, err
}

// function search an address
// and saves it to specific point
// inside the points collection
func (point *Point) UpdateAddress() error {
	session := config.Connect()
	defer session.Close()

	pointsCollection := session.DB(databaseName).C(collectionName)

	point.defineAddress(GoogleGeocoder)
	return pointsCollection.Update(bson.M{"_id": point.Id}, bson.M{"$set": bson.M{"address": point.Address}})
}

// function saves new note into array inside of point
func (point *Point) AddNote(note *note.Note) error {
	session := config.Connect()
	defer session.Close()

	pointsCollection := session.DB(databaseName).C(collectionName)

	note.SanitizeContent()
	return pointsCollection.Update(bson.M{"_id": point.Id}, bson.M{"$push": bson.M{"notes": note}})
}

// function deletes a point from collection
func (point *Point) Delete() error {
	session := config.Connect()
	defer session.Close()

	pointsCollection := session.DB(databaseName).C(collectionName)

	return pointsCollection.Remove(bson.M{"_id": point.Id})
}

// function saves a new point to collection
func (point *Point) Save() error {
	session := config.Connect()
	defer session.Close()

	pointsCollection := session.DB(databaseName).C(collectionName)

	return pointsCollection.Insert(point)
}

// function makes preparations to present point on the map
// returns assempled mapObject from point properties
func (point *Point) PrepareToMap() *MapObject {
	geometry := Geometry{
		Type:   "Point",
		Coords: []float64{point.Loc.Coordinates[1], point.Loc.Coordinates[0]},
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
