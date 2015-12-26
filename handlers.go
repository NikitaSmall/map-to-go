package main

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

func IndexHandler(c *gin.Context) {
	c.HTML(http.StatusOK, TemplateFullPath("index", ""), nil)
}

func AddPointHandler(c *gin.Context) {
	point := CreatePoint()

	err := c.BindJSON(point)
	if err != nil {
		panic(err)
	}

	err = point.Save()
	if err != nil {
		panic(err)
	}

	c.JSON(http.StatusOK, point)
}

func GetPointsHandler(c *gin.Context) {
	points, err := GetPoints()
	if err != nil {
		panic(err)
	}

	c.JSON(http.StatusOK, points)
}
