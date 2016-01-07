package note

import (
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/microcosm-cc/bluemonday"
)

var policy = bluemonday.UGCPolicy()

func sanitizeString(text string) string {
	return policy.Sanitize(text)
}
