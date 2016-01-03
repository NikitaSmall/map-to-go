package note

import (
	"testing"
)

func TestSanitizeUsualText(t *testing.T) {
	safeText := "We have a link: <a href=\"https://google.com\" rel=\"nofollow\">google</a>"
	note := CreateNote()
	note.Note = safeText

	note.SanitizeContent()
	if note.Note != safeText {
		t.Error("Sanitizer works wrong! It is too hard. Result: ", note.Note)
	}
}

func TestSanitizeDangerText(t *testing.T) {
	dangerText := "Ahoy! <script>alert('cant touch me!');</script>"
	note := CreateNote()
	note.Note = dangerText

	note.SanitizeContent()
	if note.Note == dangerText {
		t.Error("Sanitizer works wrong! It is too soft. Result: ", note.Note)
	}
}
