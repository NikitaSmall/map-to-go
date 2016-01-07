package user

import (
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/gopkg.in/mgo.v2/bson"
	"github.com/nikitasmall/map-to-go/config"
	"os"
	"testing"
)

func testUser() *User {
	user := CreateUser()
	user.Username = "TestUser"
	user.Password = "TestPassword"

	return user
}

func TestMain(m *testing.M) {
	databaseName = "mapToGoTest"
	os.Exit(m.Run())
}

func TestCreateUser(t *testing.T) {
	userOne := CreateUser()
	userTwo := CreateUser()

	if userOne.Id == userTwo.Id {
		t.Error("user created with same id! ", userOne.Id)
	}
}

func TestRegisterUser(t *testing.T) {
	session := config.Connect()
	user := testUser()

	usersCollection := session.DB(databaseName).C(collectionName)
	defer func() {
		usersCollection.Remove(bson.M{"_id": user.Id})
		session.Close()
	}()

	initCount, err := usersCollection.Count()
	if err != nil {
		t.Error("cannot obtain init count. ", err.Error())
	}

	err = user.Register()
	if err != nil {
		t.Error("cannot register correct user. ", err.Error())
	}

	updatedCount, err := usersCollection.Count()
	if err != nil {
		t.Error("cannot obtain updated count. ", err.Error())
	}

	if initCount+1 != updatedCount {
		t.Error("Wrong users count after registration!", initCount)
	}
}

func TestRegisterUserFail(t *testing.T) {
	session := config.Connect()
	userOne := testUser()
	userTwo := testUser() // this will give us a same username while id are different

	usersCollection := session.DB(databaseName).C(collectionName)
	defer func() {
		usersCollection.Remove(bson.M{"_id": userOne.Id})
		session.Close()
	}()

	err := userOne.Register()
	if err != nil {
		t.Error("cannot register correct user. ", err.Error())
	}

	initCount, err := usersCollection.Count()
	if err != nil {
		t.Error("cannot obtain init count. ", err.Error())
	}

	err = userTwo.Register()
	if err == nil {
		t.Error("Error on same username was not rised")
	}

	afterFailCount, err := usersCollection.Count()
	if err != nil {
		t.Error("cannot obtain count after failed registration count. ", err.Error())
	}

	if initCount != afterFailCount {
		t.Error("Wrong users count after failed registration!", initCount)
	}
}

func TestCheckUser(t *testing.T) {
	session := config.Connect()
	usersCollection := session.DB(databaseName).C(collectionName)

	user := testUser()
	id := user.Id
	defer func() {
		usersCollection.Remove(bson.M{"_id": id})
		session.Close()
	}()

	err := user.Register()
	if err != nil {
		t.Error("cannot register correct user. ", err.Error())
	}

	user = testUser() // we need to do this because of password mutations
	err = user.CheckUser()
	if err != nil {
		t.Error("Error on user check. Error: ", err.Error())
	}
}

func TestCheckUserFail(t *testing.T) {
	user := testUser()

	// simply look for the not saved user
	err := user.CheckUser()
	if err == nil {
		t.Error("Error on user check. Should return error")
	}
}
