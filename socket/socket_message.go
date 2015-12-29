package socket

const (
	PointAdded   = "point_add"
	PointRemoved = "point_remove"
	HintAdded    = "hint_added"
)

type SocketMessage struct {
	Action  string      `json:"action"`
	Message interface{} `json:"message"`
}
