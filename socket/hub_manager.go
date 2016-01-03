package socket

type hubManager struct {
	registerHub   chan string
	unregisterHub chan string
}

var HubManager = hubManager{
	registerHub:   make(chan string),
	unregisterHub: make(chan string),
}

func (manager *hubManager) ManageNoteHub() {
	for {
		select {
		case hubName := <-manager.registerHub:
			go NoteHub[hubName].Run()
		case hubName := <-manager.unregisterHub:
			if hubName != "main" {
				delete(NoteHub, hubName)
			}
		}
	}
}
