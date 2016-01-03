package socket

type noteHub map[string]*Hub

var NoteHub = make(noteHub)

func NoteHubRegister(client *Client) {
	if NoteHub[client.clientFor] == nil {
		newHub := newHub()
		NoteHub[client.clientFor] = &newHub

		HubManager.registerHub <- client.clientFor
	}

	NoteHub[client.clientFor].Register(client)
}
