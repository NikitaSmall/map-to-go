"use strict";

ymaps.ready(function() {
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

  objectManager.objects.options.set('preset', 'islands#greenDotIcon');
  objectManager.clusters.options.set('preset', 'islands#greenClusterIcons');
  map.geoObjects.add(objectManager);

  $.ajax({
    method: 'GET',
    url: '/points',
    contentType: "application/json; charset=utf-8"
  }).done(function(data) {
    objectManager.add(data);
  });

  map.events.add('click', function(e) {
    var coords = e.get('coords');

    $.ajax({
      method: 'POST',
      url: '/points',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({ "loc": coords.reverse() })
    }).done(function(data) {
      objectManager.add(data);
    });
  });

  objectManager.objects.events.add('contextmenu', function (e) {
    var objectId = e.get('objectId');
    var object = objectManager.objects.getById(objectId);
    var coords = object.geometry.coordinates.reverse();

    $.ajax({
      method: 'DELETE',
      url: '/points',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({ "id": object.id, "loc": coords })
    }).done(function(data) {
      objectManager.remove(object);
    });
  });

  if (window["WebSocket"]) {
    conn = new WebSocket("ws://" + getCurrentUrl() + "/hub");

    conn.onopen = function(e) {
      createNotify(
        "<strong>Welcome!</strong>",
        "Socket connection to server was successfully established!",
        "info"
      );
    }

    conn.onmessage = function(e) {
      var message = JSON.parse(e.data);

      switch (message.action) {
        case "point_add":
          socketPointAdd(objectManager, message.message)
          break;
        case "point_remove":
          socketPointRemove(objectManager, message.message)
          break;
      }
    }

    conn.onclosed = function(e) {
      createNotify(
        "<strong>Something happened!</strong>",
        "Socket connection was closed!",
        "danger"
      );
    }

  }

});

var getCurrentUrl = function() {
  var docUrl = document.URL;
  var url;

  if (docUrl.indexOf('http://') > -1) {
    url = docUrl.substring(7, docUrl.length - 1);
  } else if (docUrl.indexOf('https://') > -1) {
    url = docUrl.substring(8, docUrl.length - 1);
  } else {
    url = docUrl;
  }

  return url;
}

var createNotify = function(title, text, type) {
  $.notify({
    title: title + " ",
    message: text
  }, {
    offset: {
      x: 10,
      y: 100
    },
    type: type
  });
}

var socketPointAdd = function(objectManager, message) {
  objectManager.add(message);
  createNotify(
    "New point was created!",
    "Find it on the map!",
    "success"
  );
}

var socketPointRemove = function(objectManager, message) {
  var obj = objectManager.objects.getById(message.id);
  if (obj) { objectManager.remove(obj); }

  createNotify(
    "Point was deleted!",
    "Somebody cleanups the map...",
    "warning"
  );
}
