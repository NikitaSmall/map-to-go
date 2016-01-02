package note

import (
	"github.com/microcosm-cc/bluemonday"
)

var policy = bluemonday.UGCPolicy()

func sanitizeString(text string) string {
	return policy.Sanitize(text)
}
