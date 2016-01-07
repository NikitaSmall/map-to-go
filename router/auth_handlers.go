package router

import (
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/sessions"
	"github.com/nikitasmall/map-to-go/config"
	"github.com/nikitasmall/map-to-go/user"
	"log"
	"net/http"
)

// local storage for session
var localStorage = sessions.NewCookieStore([]byte(config.Env["sessionKey"]))

// helper function that hides all the operations with session
// and only saves username to session
func setSessionUser(username string, c *gin.Context) {
	session, err := localStorage.Get(c.Request, "auth")
	if err != nil {
		log.Panic("Cannot obtain session. ", err.Error())
	}

	session.Values["username"] = username
	err = session.Save(c.Request, c.Writer)
	if err != nil {
		log.Panic("Cannot save session. ", err.Error())
	}
}

// helper function that hides all the operations with session
// and only returns username from session.
// also returns error if the username is not set in session
func getSessionUser(c *gin.Context) (string, error) {
	session, err := localStorage.Get(c.Request, "auth")
	if err != nil {
		log.Panic("Cannot obtain session. ", err.Error())
	}

	username := session.Values["username"]
	if username == nil {
		return "", errors.New("No users stored in session")
	} else {
		return username.(string), nil
	}
}

// function binds json input from request to passed user struct
func bindUser(user *user.User, c *gin.Context) {
	err := c.BindJSON(user)
	if err != nil {
		log.Panic("Error on user binding from json. ", err.Error())
	}
}

// function that returns a name if user is set in session,
// returns nil otherwise
func checkUser(c *gin.Context) {
	username, err := getSessionUser(c)

	if err != nil {
		c.JSON(http.StatusOK, gin.H{"username": nil})
	} else {
		c.JSON(http.StatusOK, gin.H{"username": username})
	}
}

// handler function that makes attempt to register provided user
// set session for username in case of success
// and returns error with description if failed
func register(c *gin.Context) {
	u := user.CreateUser()
	bindUser(u, c)

	err := u.Register()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
	} else {
		setSessionUser(u.Username, c)
		c.JSON(http.StatusOK, gin.H{"message": "Hello, " + u.Username + "!"})
	}
}

// handler function that makes attempt to login provided user
// set session for username in case of success
// and returns error with description if failed
func login(c *gin.Context) {
	u := user.CreateUser()
	bindUser(u, c)

	err := u.CheckUser()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
	} else {
		setSessionUser(u.Username, c)
		c.JSON(http.StatusOK, gin.H{"message": "Hello, " + u.Username + "!"})
	}
}

// handler function that remove user's session from local storage
func logout(c *gin.Context) {
	session, err := localStorage.Get(c.Request, "auth")
	if err != nil {
		log.Panic("Cannot obtain session. ", err.Error())
	}

	delete(session.Values, "username")
	err = session.Save(c.Request, c.Writer)
	if err != nil {
		log.Panic("Cannot save session. ", err.Error())
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logout is successfull."})
}
