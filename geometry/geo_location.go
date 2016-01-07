package geometry

import (
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/codingsince1985/geo-golang"
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/codingsince1985/geo-golang/google"
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/codingsince1985/geo-golang/mapquest/nominatim"
	"log"
)

// constants to avoid magic numbers when calling geoCoders
const (
	GoogleGeocoder    = 0
	NominatumGeocoder = 1
	NilGeocoder       = 2
)

var geoCoders = []geo.Geocoder{google.Geocoder(), nominatim.Geocoder()}

// function defines and sets an address value
// for a point, use a fallback geoCoder
// before set point as unavailable
func (point *Point) defineAddress(geoCoderIndex int) {
	if geoCoderIndex == len(geoCoders) {
		log.Print("No address provided to point. Set as unavailable")
		point.Address = "not available"
		return
	}
	geoCoder := geoCoders[geoCoderIndex]

	address, err := geoCoder.ReverseGeocode(point.Loc[1], point.Loc[0])
	if err != nil {
		log.Print("Reverse geocoding failed, with error: ", err.Error())
		point.defineAddress(geoCoderIndex + 1)
		return
	}

	point.Address = address
}
