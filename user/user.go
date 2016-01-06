package user

import (
	"crypto/md5"
	"errors"
	"github.com/nikitasmall/map-to-go/config"
	"gopkg.in/mgo.v2/bson"
	"log"
)

// configs for connection
var databaseName = config.Env["dbName"]
var collectionName = "users"

type Authenticator interface {
	Register() error
	CheckUser() error

	hasSameUsername() bool
	encryptPassword()
}

type User struct {
	Id       string `json:"id" bson:"_id,omitempty"`
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func CreateUser() *User {
	return &User{
		Id: bson.NewObjectId().Hex(),
	}
}

func (user *User) Register() error {
	if user.hasSameUsername() {
		return errors.New("This username already taken. Choose another one.")
	}

	user.encryptPassword()
	session := config.Connect()
	usersCollection := session.DB(databaseName).C(collectionName)

	err := usersCollection.Insert(user)
	if err != nil {
		log.Print("Error on user inserting. ", err.Error())
		return err
	}
	session.Close()

	return nil
}

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
		}
		log.Print("Cannot set uniquiness of username. ", err.Error())
		return err
	}

	return nil
}

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

func (user *User) encryptPassword() {
	checksum := md5.Sum([]byte(user.Password))
	user.Password = string(checksum[:])
}
