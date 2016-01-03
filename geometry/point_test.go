package geometry

import (
	"github.com/nikitasmall/map-to-go/config"
	"github.com/nikitasmall/map-to-go/note"
	"testing"
)

// basic fixture
func testPoint() *Point {
	point := CreatePoint()
	point.Loc = []float64{42.1, 24.1}
	return point
}

// bad point fixture
func testBadPoint() *Point {
	point := CreatePoint()
	point.Loc = []float64{33.32, 44.36}
	return point
}

// basic note fixture
func testNote() *note.Note {
	note := note.CreateNote()
	note.Note = "some_text"

	return note
}

func TestCreatePoint(t *testing.T) {
	point_one := CreatePoint()
	point_two := CreatePoint()

	if point_one.Id == point_two.Id {
		t.Error("Expected uniq points, got the same. ID: ", point_one.Id)
	}
}

func TestNewPointWithEmptyNotesArray(t *testing.T) {
	point := CreatePoint()

	if len(point.Notes) > 0 {
		t.Error("Point initialized with not-empty notes array.", point.Notes)
	}
}

func TestPointWithNotes(t *testing.T) {
	point := testPoint()
	defer point.Delete()

	err := point.Save()
	if err != nil {
		t.Error("Saving raised an error! ", err)
	}

	note := testNote()
	point.AddNote(note)

	point, err = GetPoint(point.Id)
	if err != nil {
		t.Error("Cannot find point! ", err)
	}

	if len(point.Notes) != 1 {
		t.Error("Note was not added to point array!", point.Notes)
	}
}

func TestSaveDelete(t *testing.T) {
	session := config.Connect()
	pointsCollection := session.DB("mapToGo").C("points")
	defer session.Close()

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

func TestDefineAddress(t *testing.T) {
	point := testPoint()
	point.defineAddress(GoogleGeocoder)

	if point.Address == "" {
		t.Error("Address is not set after DefineAddress function.")
	}
}

func TestBadPointAddress(t *testing.T) {
	point := testBadPoint()
	defer point.Delete()

	err := point.Save()
	if err != nil {
		t.Error("Saving raised an error! ", err)
	}

	point.UpdateAddress()

	if point.Address != "not available" {
		t.Error("Point became normal for now!", point.Address)
	}
}

func TestGetPointsAndMapObjects(t *testing.T) {
	pointOne := testPoint()
	pointTwo := testPoint()

	pointOne.Save()
	pointTwo.Save()

	defer func() {
		pointOne.Delete()
		pointTwo.Delete()
	}()

	points, err := GetPoints()
	if err != nil {
		t.Error("Cannot get points from base! ", err)
	}

	mapObjects := PointsArrayToMap(points)

	if len(mapObjects) != len(*points) {
		t.Error("Something wrong in trasform to mapObject!", len(mapObjects))
	}
}
