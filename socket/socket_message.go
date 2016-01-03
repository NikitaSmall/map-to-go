package socket

// constants contains special instuctions
// for the clients in browser
const (
	PointAdded   = "point_add"
	PointRemoved = "point_remove"
	HintAdded    = "hint_added"
	NoteAdded    = "note_added"
)

// basic message that will be sent to the browser
type SocketMessage struct {
	Action  string      `json:"action"`
	Message interface{} `json:"message"`
}
