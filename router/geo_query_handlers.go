package router

import (
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/geometry"
	"log"
	"net/http"
)

const (
	searchRange = 1000
)

func searchPointsNearHandler(c *gin.Context) {
	point := geometry.CreatePoint()
	bindPoint(point, c)

	points, err := point.SearchNear(searchRange)
	if err != nil {
		log.Print("Error on points search: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
	} else {
		c.JSON(http.StatusOK, geometry.PointsArrayToMap(points))
	}
}
