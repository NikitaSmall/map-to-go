"use strict";
ymaps.ready(function() {
  // initial work
  var balloonLayout = require('./balloon_layout.js');
  var config = require('./settings.js');
  var socket = require('./socket.js');

  var conn = socket.connection;

  $.ajax({
    method: 'GET',
    url: '/user',
    contentType: "application/json; charset=utf-8"
  }).done(function(data) {
    if (data.username != null) {
      config.toggleAuthButtons();

      socket.createNotify(
        "Welcome back!",
        data.username + ", we a glad to see you!",
        "info"
      );
    }
  }).fail(function(data, textStatus, errorThrown) {
    socket.createNotify(
      "Error occurred on the server!",
      data.responseJSON.message,
      "danger"
    );
  });

  $('#logout').click(function(e) {
    e.preventDefault();

    $.ajax({
      method: 'DELETE',
      url: '/logout',
      contentType: "application/json; charset=utf-8"
    }).done(function(data) {
      if (data.message.length > 0) {
        config.toggleAuthButtons();

        socket.createNotify(
          "Farewell!",
          data.message,
          "warning"
        );
      }
    }).fail(function(data, textStatus, errorThrown) {
      socket.createNotify(
        "Error occurred on the server!",
        data.responseJSON.message,
        "danger"
      );
    });
  })

  $("#loginForm").unbind("submit");
  $('#loginForm').submit(function(e) {
    var me = $(this);
    e.preventDefault();

    var username = $('#usernameLogin').val();
    var password = $('#passwordLogin').val();

    $.ajax({
      method: 'POST',
      url: '/login',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({ "username": username, "password": password }),
      complete: function() {
            me.data('requestRunning', false);
        }
    }).done(function(data) {
      socket.createNotify(
        "Login successfull:",
        data.message,
        "info"
      );
      config.toggleAuthButtons();
      $('#modalLogin').modal('hide');
    }).fail(function(data, textStatus, errorThrown) {
      socket.createNotify(
        "Error:",
        data.responseJSON.message,
        "danger"
      );
      $('#modalLogin').modal('hide');
    });
  });

  $("#registerForm").unbind("submit");
  $('#registerForm').submit(function(e) {
    var me = $(this);
    e.preventDefault();

    var username = $('#usernameRegister').val();
    var password = $('#passwordRegister').val();

    $.ajax({
      method: 'POST',
      url: '/register',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({ "username": username, "password": password }),
      complete: function() {
            me.data('requestRunning', false);
        }
    }).done(function(data) {
      socket.createNotify(
        "Registration complete:",
        data.message,
        "info"
      );
      config.toggleAuthButtons();
      $('#modalRegister').modal('hide');
    }).fail(function(data, textStatus, errorThrown) {
      $('#modalLogin').modal('hide');
      socket.createNotify(
        "Error:",
        data.responseJSON.message,
        "danger"
      );
    });
  });

  var map = new ymaps.Map('map', {
    // [latitude, longitude]
    center: [46.23, 30.47],
    zoom: 10
  });

  var markerElement = jQuery('#marker');
  var dragger = new ymaps.util.Dragger({
    // Драггер будет автоматически запускаться при нажатии на элемент 'marker'.
    autoStartElement: markerElement[0]
  });
  var markerOffset;
  var markerPosition;

  var searchCircle = new ymaps.Circle([
    // Координаты центра круга.
    [55.76, 37.60],
    // Радиус круга в метрах.
    10000
  ], {
    hintContent: "Search area. Move pin to search in another place. Right click it to stop searching."
  }, {
      fillColor: "#DB709344",
      strokeColor: "#990066",
      strokeOpacity: 0.2,
      strokeWidth: 2
  });

  var objectManager = new ymaps.ObjectManager({
    clusterize: true,
    gridSize: 32
  });

  var searchObjectManager = new ymaps.ObjectManager({
    clusterize: true,
    gridSize: 32
  });

  config.setOptionsObjectManager(objectManager, balloonLayout.Layout, balloonLayout.ContentLayout);
  config.setSearchOptionsObjectManager(searchObjectManager, balloonLayout.Layout, balloonLayout.ContentLayout);
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
      data: JSON.stringify({ "loc": {"coordinates": coords.reverse(), "-": "Point"} })
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
      data: JSON.stringify({ "id": object.id, "loc": {"coordinates": coords.reverse(), "-": "Point"}  })
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
        data: JSON.stringify({ "id": object.id, "loc": {"coordinates": coords.reverse(), "-": "Point"} })
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

  searchCircle.events.add('contextmenu', function(event) {
    if (map.geoObjects.indexOf(objectManager) == -1) {
      map.geoObjects.add(objectManager);
    }

    map.geoObjects.remove(searchObjectManager);
    map.geoObjects.remove(searchCircle);

    searchObjectManager.removeAll();
  });

  dragger.events
    .add('start', onDraggerStart)
    .add('move', onDraggerMove)
    .add('stop', onDraggerEnd);

  function onDraggerStart(event) {
    map.geoObjects.remove(searchCircle);

    var offset = markerElement.offset(),
      position = event.get('position');
    // Сохраняем смещение маркера относительно точки начала драга.
    markerOffset = [
      position[0] - offset.left,
      position[1] - offset.top
    ];
    markerPosition = [
      position[0] - markerOffset[0],
      position[1] - markerOffset[1]
    ];

    applyMarkerPosition();
  }

  function onDraggerMove(event) {
    applyDelta(event);
  }

  function onDraggerEnd(event) {
    applyDelta(event);
    markerPosition[0] += markerOffset[0];
    markerPosition[1] += markerOffset[1];
    // Переводим координаты страницы в глобальные пиксельные координаты.
    var markerGlobalPosition = map.converter.pageToGlobal(markerPosition),
      // Получаем центр карты в глобальных пиксельных координатах.
      mapGlobalPixelCenter = map.getGlobalPixelCenter(),
      // Получением размер контейнера карты на странице.
      mapContainerSize = map.container.getSize(),
      mapContainerHalfSize = [mapContainerSize[0] / 2, mapContainerSize[1] / 2],
      // Вычисляем границы карты в глобальных пиксельных координатах.
      mapGlobalPixelBounds = [
        [mapGlobalPixelCenter[0] - mapContainerHalfSize[0], mapGlobalPixelCenter[1] - mapContainerHalfSize[1]],
        [mapGlobalPixelCenter[0] + mapContainerHalfSize[0], mapGlobalPixelCenter[1] + mapContainerHalfSize[1]]
      ];
    // Проверяем, что завершение работы драггера произошло в видимой области карты.
    if (containsPoint(mapGlobalPixelBounds, markerGlobalPosition)) {
      // Теперь переводим глобальные пиксельные координаты в геокоординаты с учетом текущего уровня масштабирования карты.
      var geoPosition = map.options.get('projection').fromGlobalPixels(markerGlobalPosition, map.getZoom());
      console.log(geoPosition.join(' '));
      searchCircle.geometry.setCoordinates(geoPosition);
      if (map.geoObjects.indexOf(searchCircle) == -1) {
        map.geoObjects.add(searchCircle);
      }

      if (map.geoObjects.indexOf(searchObjectManager) == -1) {
        map.geoObjects.add(searchObjectManager);
        var coords = [geoPosition[1], geoPosition[0]];
        $.ajax({
          method: 'POST',
          url: '/search/points',
          contentType: "application/json; charset=utf-8",
          data: JSON.stringify({ "loc": {"coordinates": coords, "-": "Point"} })
        }).done(function(data) {
          var count = data.length;

          searchObjectManager.add(data);
          socket.createNotify(
            "Search:",
            count + " points found.",
            "info"
          );
        }).fail(function(data, textStatus, errorThrown) {
          socket.createNotify(
            "Error occurred on the server!",
            data.responseJSON.message,
            "danger"
          );
        });
      }

      map.geoObjects.remove(objectManager);
    } else {
      if (map.geoObjects.indexOf(objectManager) == -1) {
        map.geoObjects.add(objectManager);
      }

      map.geoObjects.remove(searchCircle);
      map.geoObjects.remove(searchObjectManager);
    }

    $('#marker').css('top', '5px');
    $('#marker').css('left', '20px');
  }

  function applyDelta (event) {
    // Поле 'delta' содержит разницу между положениями текущего и предыдущего события драггера.
    var delta = event.get('delta');
    markerPosition[0] += delta[0];
    markerPosition[1] += delta[1];
    applyMarkerPosition();
  }

  function applyMarkerPosition () {
    markerElement.css({
        left: markerPosition[0],
        top: markerPosition[1]
    });
  }

  function containsPoint (bounds, point) {
    return point[0] >= bounds[0][0] && point[0] <= bounds[1][0] &&
           point[1] >= bounds[0][1] && point[1] <= bounds[1][1];
  }

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
      case "note_added":
        balloonLayout.insertMessage(message.message);
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



});
