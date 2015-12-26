package main

type Point struct {
	Id  string    `json:"id"`
	Loc []float64 `json:"loc" binding:"required"`
}
