"use strict";
ymaps.ready(function() {
  // initial work
  var balloonLayout = require('./balloon_layout.js');
  var config = require('./settings.js');
  var socket = require('./socket.js');

  var conn;

  var map = new ymaps.Map('map', {
    // [latitude, longitude]
    center: [46.23, 30.47],
    zoom: 10
  });

  var objectManager = new ymaps.ObjectManager({
    clusterize: true,
    gridSize: 32
  });

  config.setOptionsObjectManager(objectManager, balloonLayout.Layout, balloonLayout.ContentLayout);
  map.geoObjects.add(objectManager);

  // get all the points
  $.ajax({
    method: 'GET',
    url: '/points',
    contentType: "application/json; charset=utf-8"
  }).done(function(data) {
    objectManager.add(data);
  }).fail(function(data, textStatus, errorThrown) {
    socket.createNotify(
      "Error occurred on the server!",
      data.responseJSON.message,
      "danger"
    );
  });

  // create new point
  map.events.add('click', function(e) {
    var coords = e.get('coords');

    $.ajax({
      method: 'POST',
      url: '/points',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({ "loc": coords.reverse() })
    }).done(function(data) {
      objectManager.add(data);
    }).fail(function(data, textStatus, errorThrown) {
      socket.createNotify(
        "Error occurred on the server!",
        data.responseJSON.message,
        "danger"
      );
    });
  });

  // delete point
  objectManager.objects.events.add('contextmenu', function (e) {
    var objectId = e.get('objectId');
    var object = objectManager.objects.getById(objectId);
    var coords = [object.geometry.coordinates[1], object.geometry.coordinates[0]];

    $.ajax({
      method: 'DELETE',
      url: '/points',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({ "id": object.id, "loc": coords })
    }).done(function(data) {
      objectManager.remove(object);
    }).fail(function(data, textStatus, errorThrown) {
      socket.createNotify(
        "Error occurred on the server!",
        data.responseJSON.message,
        "danger"
      );
    });
  });

  // hover mouse over point and get address if needed
  objectManager.objects.events.add('mouseenter', function(e) {
    var objectId = e.get('objectId');
    var object = objectManager.objects.getById(objectId);
    var coords = [object.geometry.coordinates[1], object.geometry.coordinates[0]];

    if (object.properties.hintContent == "") {
      $.ajax({
        method: 'PATCH',
        url: '/points',
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({ "id": object.id, "loc": coords })
      }).done(function(data) {
        object.properties.hintContent = data.message;
        objectManager.objects.hint.open(objectId);
      }).fail(function(data, textStatus, errorThrown) {
        socket.createNotify(
          "Error occurred on the server!",
          data.responseJSON.message,
          "danger"
        );
      });
    }
  });

  if (window["WebSocket"]) {
    conn = new WebSocket("ws://" + config.getCurrentUrl() + "/hub");

    conn.onopen = function(e) {
      socket.createNotify(
        "Welcome!",
        "Socket connection to server was successfully established!",
        "info"
      );
    }

    conn.onmessage = function(e) {
      var message = JSON.parse(e.data);

      switch (message.action) {
        case "point_add":
          socket.PointAdd(objectManager, message.message)
          break;
        case "point_remove":
          socket.PointRemove(objectManager, message.message)
          break;
        case "hint_added":
          socket.HintAdd(objectManager, message.message)
          break;
      }
    }

    conn.onclose = function(e) {
      socket.createNotify(
        "Something happened!",
        "Socket connection was closed!",
        "danger"
      );
    }

  }

});
