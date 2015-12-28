package socket

const (
	PointAdded   = "point_add"
	PointRemoved = "point_remove"
)

type SocketMessage struct {
	Action  string      `json:"action"`
	Message interface{} `json:"message"`
}
