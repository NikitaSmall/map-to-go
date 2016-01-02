package router

import (
	"bytes"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/config"
	"github.com/nikitasmall/map-to-go/geometry"
	"gopkg.in/mgo.v2"
	"net/http"
	"net/http/httptest"
	"testing"
)

func newPointTestRouter() *gin.Engine {
	testRouter := gin.Default()

	testRouter.GET("/points", getPointsHandler)
	testRouter.POST("/points", addPointHandler)
	testRouter.PATCH("/points", setAddressPointHandler)
	testRouter.DELETE("/points", deletePointHandler)

	return testRouter
}

func newTestPoint() *geometry.Point {
	point := geometry.CreatePoint()
	point.Loc = []float64{42.1, 24.1}

	return point
}

func newEncodedPoint() []byte {
	obj, err := json.Marshal(newTestPoint())
	if err != nil {
		panic(err)
	}
	return obj
}

var testPointRouter = newPointTestRouter()

func TestAddDeletePointHandler(t *testing.T) {
	session := config.Connect()
	pointsCollection := session.DB("mapToGo").C("points")
	defer func() { session.Close() }()

	testPoint := newEncodedPoint()
	var body bytes.Buffer
	body.Write(testPoint)

	testAddPointHandler(t, body, pointsCollection)
	testSetAddressPointHandler(t, body, pointsCollection)
	testDeletePointHandler(t, body, pointsCollection)
}

func testAddPointHandler(t *testing.T, body bytes.Buffer, pointsCollection *mgo.Collection) {
	initCount, err := pointsCollection.Count()
	if err != nil {
		t.Error("Counting raised an error! ", err)
	}

	w := httptest.NewRecorder()
	r, err := http.NewRequest("POST", "/points", &body)

	if err != nil {
		t.Error("Cannot create new request! ", err.Error())
	}

	testPointRouter.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Error("Response has unexpected status code! ", w.Code)
	}

	if w.Body == nil {
		t.Error("Response shouldn't return empty body! ", w.Body)
	}

	countAfterInsert, err := pointsCollection.Count()
	if err != nil {
		t.Error("Counting raised an error! ", err)
	}

	if initCount+1 != countAfterInsert {
		t.Error("New point was not inserted! Count: ", countAfterInsert)
	}
}

func testSetAddressPointHandler(t *testing.T, body bytes.Buffer, pointsCollection *mgo.Collection) {
	initCount, err := pointsCollection.Count()
	if err != nil {
		t.Error("Counting raised an error! ", err)
	}

	w := httptest.NewRecorder()
	r, err := http.NewRequest("PATCH", "/points", &body)

	if err != nil {
		t.Error("Cannot create new request! ", err.Error())
	}

	testPointRouter.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Error("Response has unexpected status code! ", w.Code)
	}

	if w.Body == nil {
		t.Error("Response shouldn't return empty body! ", w.Body)
	}

	countAfterInsert, err := pointsCollection.Count()
	if err != nil {
		t.Error("Counting raised an error! ", err)
	}

	if initCount != countAfterInsert {
		t.Error("Points count was changed! Count: ", countAfterInsert)
	}
}

func testDeletePointHandler(t *testing.T, body bytes.Buffer, pointsCollection *mgo.Collection) {
	initCount, err := pointsCollection.Count()
	if err != nil {
		t.Error("Counting raised an error! ", err)
	}

	w := httptest.NewRecorder()
	r, err := http.NewRequest("DELETE", "/points", &body)

	if err != nil {
		t.Error("Cannot create new request! ", err.Error())
	}

	testPointRouter.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Error("Response has unexpected status code! ", w.Code)
	}

	if w.Body == nil {
		t.Error("Response shouldn't return empty body! ", w.Body)
	}

	countAfterDelete, err := pointsCollection.Count()
	if err != nil {
		t.Error("Counting raised an error! ", err)
	}

	if initCount-1 != countAfterDelete {
		t.Error("Point was not deleted! Count: ", countAfterDelete)
	}
}

func TestGetPointsHandler(t *testing.T) {
	w := httptest.NewRecorder()
	r, err := http.NewRequest("GET", "/points", nil)

	if err != nil {
		t.Error("Cannot create new request! ", err.Error())
	}

	testPointRouter.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Error("Response has unexpected status code! ", w.Code)
	}

	if w.Body == nil {
		t.Error("Response shouldn't return empty body! ", w.Body)
	}
}
