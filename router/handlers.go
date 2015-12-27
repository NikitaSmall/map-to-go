package router

import (
	"github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/config"
	"github.com/nikitasmall/map-to-go/geometry"
	"net/http"
)

func IndexHandler(c *gin.Context) {
	c.HTML(http.StatusOK, config.TemplateFullPath("index", ""), nil)
}

func AddPointHandler(c *gin.Context) {
	point := geometry.CreatePoint()

	err := c.BindJSON(point)
	if err != nil {
		panic(err)
	}

	err = point.Save()
	if err != nil {
		panic(err)
	}

	c.JSON(http.StatusOK, point.PrepareToMap())
}

func GetPointsHandler(c *gin.Context) {
	points, err := geometry.GetPoints()
	if err != nil {
		panic(err)
	}

	c.JSON(http.StatusOK, geometry.PointsArrayToMap(points))
}
