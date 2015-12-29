package geometry

import (
	"github.com/codingsince1985/geo-golang"
	"github.com/codingsince1985/geo-golang/google"
	"log"
)

// function returns new geocoder
func newGeoCoder() geo.Geocoder {
	return google.Geocoder()
}

// function defines and sets an address value
// for a point
func (point *Point) DefineAddress() {
	geoCoder := newGeoCoder()

	address, err := geoCoder.ReverseGeocode(point.Loc[1], point.Loc[0])
	if err != nil {
		log.Print("Reverse geocoding failed, with error: ", err.Error())

		point.Address = err.Error()
		return
	}

	point.Address = address
}
