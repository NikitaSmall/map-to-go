package geometry

import (
	"github.com/nikitasmall/map-to-go/config"
	// "gopkg.in/mgo.v2/bson"
	"testing"
)

// basic fixture
func testPoint() *Point {
	point := CreatePoint()
	point.Loc = []float64{42.1, 24.1}
	return point
}

func TestCreatePoint(t *testing.T) {
	point_one := CreatePoint()
	point_two := CreatePoint()

	if point_one.Id == point_two.Id {
		t.Error("Expected uniq points, got the same. ID: ", point_one.Id)
	}
}

func TestSaveDelete(t *testing.T) {
	session := config.Connect()
	pointsCollection := session.DB("mapToGo").C("points")
	defer func() { session.Close() }()

	initCount, err := pointsCollection.Count()
	if err != nil {
		t.Error("Counting raised an error! ", err)
	}

	point := testPoint()

	err = point.Save()
	if err != nil {
		t.Error("Saving raised an error! ", err)
	}

	countAfterInsert, err := pointsCollection.Count()
	if err != nil {
		t.Error("Counting raised an error! ", err)
	}

	if initCount+1 != countAfterInsert {
		t.Error("new point was not inserted! Count: ", countAfterInsert)
	}

	err = point.Delete()
	if err != nil {
		t.Error("Deleting raised an error! ", err)
	}

	countAfterDelete, err := pointsCollection.Count()
	if err != nil {
		t.Error("Counting raised an error! ", err)
	}

	if countAfterInsert-1 != countAfterDelete {
		t.Error("new point was not inserted! Count: ", countAfterDelete)
	}
}

func TestPrepareToMap(t *testing.T) {
	point := testPoint()
	mapObject := point.PrepareToMap()

	if mapObject.Type != "Feature" {
		t.Error("Wrong type of map object. Type: ", mapObject.Type)
	}

	if mapObject.Geometry.Coords[0] != point.Loc[1] || mapObject.Geometry.Coords[1] != point.Loc[0] {
		t.Error("Coordinates are not inverted for yandex map!")
	}
}
