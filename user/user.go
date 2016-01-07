package user

import (
	"crypto/md5"
	"errors"
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/gopkg.in/mgo.v2/bson"
	"github.com/nikitasmall/map-to-go/config"
	"log"
)

// configs for connection
var databaseName = config.Env["dbName"]
var collectionName = "users"

// interface that determinates behavior of users
type Authenticator interface {
	Register() error
	CheckUser() error

	hasSameUsername() bool
	encryptPassword()
}

// base user struct. No email or other things.
type User struct {
	Id       string `json:"id" bson:"_id,omitempty"`
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// function returns user with generated id
func CreateUser() *User {
	return &User{
		Id: bson.NewObjectId().Hex(),
	}
}

// function makes attempt to register user.
// In case of success returns nil,
// in other returns error with reason
func (user *User) Register() error {
	session := config.Connect()
	defer session.Close()

	if user.hasSameUsername() {
		return errors.New("This username already taken. Choose another one.")
	}

	user.encryptPassword()
	usersCollection := session.DB(databaseName).C(collectionName)

	err := usersCollection.Insert(user)
	if err != nil {
		log.Print("Error on user inserting. ", err.Error())
		return err
	}

	return nil
}

// function check the user's existence
// (for login or similar actions),
// returns nil if the user exists,
// otherwise returns error with description
func (user *User) CheckUser() error {
	session := config.Connect()
	defer session.Close()

	usersCollection := session.DB(databaseName).C(collectionName)
	user.encryptPassword()

	u := CreateUser()
	err := usersCollection.Find(bson.M{"username": user.Username, "password": user.Password}).One(u)

	if err != nil {
		if err.Error() == "not found" {
			return errors.New("Cannot find user with such username or password!")
		} else {
			// if error other than "not found" we log this
			log.Print("Cannot establish uniquiness of username. ", err.Error())
			return err
		}
	}

	return nil
}

// function returns true in case of user with same name existence,
// otherwise (if username is new) return false
func (user *User) hasSameUsername() bool {
	session := config.Connect()
	defer session.Close()

	usersCollection := session.DB(databaseName).C(collectionName)
	var users []User

	err := usersCollection.Find(bson.M{"username": user.Username}).All(&users)
	if err != nil {
		log.Panic("Cannot set uniquiness of username. ", err.Error())
	}

	return len(users) > 0
}

// function encrypt the password of user.
// 'true' password is not stored, only hash result of checksum
func (user *User) encryptPassword() {
	checksum := md5.Sum([]byte(user.Password))
	user.Password = string(checksum[:])
}
