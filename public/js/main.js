(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var socket = require('./socket.js');
var config = require('./settings.js');
var connection = socket.connection;

module.exports.ContentLayout = ymaps.templateLayoutFactory.createClass(
  '<div class="panel-footer">' +
    '<form id="note-form">' +
      '<div class="input-group">' +
        '<input type="hidden" id="point-id" value="" />' +
        '<input id="btn-input" type="text" autocomplete="off" class="form-control input-sm" placeholder="Type your message here..." />' +
        '<span class="input-group-btn">' +
          '<button class="btn btn-warning btn-sm" id="btn-chat" type="submit">' +
          'Send</button>' +
        '</span>' +
        '<a class="close" href="#">&times;</a>' +
      '</div>' +
    '</form>' +
  '</div>' +
  '<div class="panel-body">' +
    '<ul class="chat">' +
      '$[properties.balloonContent]' +
    '</ul>' +
  '</div>'
);

var insertMessage = function(data) {
  if ($('li#' + data.id).length) { return; }
  var $chat = $('.chat');
  if (
    ($chat.html() == "Wait for data...") ||
    ($chat.html() == "There are no notes")
  ) {
    $chat.html(socket.balloonMessage(data.note, data.author, data.createdAt, data.id))
  } else {
    $chat.prepend(socket.balloonMessage(data.note, data.author, data.createdAt, data.id))
  }
};

module.exports.insertMessage = insertMessage;

module.exports.Layout = ymaps.templateLayoutFactory.createClass(
  '<div class="panel panel-primary">' +
    '$[[options.contentLayout]]' +
    '<div class="arrow"></div>' +
  '</div>', {
  /**
   * Строит экземпляр макета на основе шаблона и добавляет его в родительский HTML-элемент.
   * @see https://api.yandex.ru/maps/doc/jsapi/2.1/ref/reference/layout.templateBased.Base.xml#build
   * @function
   * @name build
   */
  build: function () {
    this.constructor.superclass.build.call(this);
    var pointId = this._data.object.id;
    $('#point-id').val(pointId);

    connection.send(pointId);
    socket.createNotify(
      "You opened balloon!",
      "Socket connection to server was successfully established!",
      "info"
    );

    this._$element = $('.panel', this.getParentElement());
    this.applyElementOffset();

    this._$element.find('.close').on('click', $.proxy(this.onCloseClick, this));
    $('#note-form').bind('submit', this.onNoteFormSubmit);

    $.ajax({
      method: 'GET',
      url: '/notes/' + pointId
    }).done(function(data) {
      if (!!data && data.length > 0) {
        for (var i = 0; i < data.length; i++) {
          insertMessage(data[i]);
        }
      } else {
        $('.chat').html("There are no notes");
      }
    });
  },

  onNoteFormSubmit: function(e) {
    e.preventDefault();
    var message = $('#btn-input').val();
    var id = $('#point-id').val();

    if (message != '') {
      $.ajax({
        method: 'POST',
        url: '/notes',
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({ "pointId": id, "note": message })
      }).done(function(data) {
        insertMessage(data);
        $('#btn-input').val('');
      });
    }

  },

  /**
   * Удаляет содержимое макета из DOM.
   * @see https://api.yandex.ru/maps/doc/jsapi/2.1/ref/reference/layout.templateBased.Base.xml#clear
   * @function
   * @name clear
   */
  clear: function () {
    connection.send("main");

    socket.createNotify(
      "Balloon was closed!",
      "You close it or someone deletes this point!",
      "warning"
    );

    $('#note-form').unbind('submit', this.onNoteFormSubmit);
    this._$element.find('.close').off('click');
    this.constructor.superclass.clear.call(this);
  },

  /**
   * Метод будет вызван системой шаблонов АПИ при изменении размеров вложенного макета.
   * @see https://api.yandex.ru/maps/doc/jsapi/2.1/ref/reference/IBalloonLayout.xml#event-userclose
   * @function
   * @name onSublayoutSizeChange
   */
  onSublayoutSizeChange: function () {
    MyBalloonLayout.superclass.onSublayoutSizeChange.apply(this, arguments);
    if(!this._isElement(this._$element)) {
        return;
    }
    this.applyElementOffset();
    this.events.fire('shapechange');
  },

  /**
   * Сдвигаем балун, чтобы "хвостик" указывал на точку привязки.
   * @see https://api.yandex.ru/maps/doc/jsapi/2.1/ref/reference/IBalloonLayout.xml#event-userclose
   * @function
   * @name applyElementOffset
   */
  applyElementOffset: function () {
    this._$element.css({
      left: -(this._$element[0].offsetWidth / 2),
      top: -(this._$element[0].offsetHeight + this._$element.find('.arrow')[0].offsetHeight)
    });
  },

  /**
   * Закрывает балун при клике на крестик, кидая событие "userclose" на макете.
   * @see https://api.yandex.ru/maps/doc/jsapi/2.1/ref/reference/IBalloonLayout.xml#event-userclose
   * @function
   * @name onCloseClick
   */
  onCloseClick: function (e) {
    e.preventDefault();
    this.events.fire('userclose');
  },

  /**
   * Используется для автопозиционирования (balloonAutoPan).
   * @see https://api.yandex.ru/maps/doc/jsapi/2.1/ref/reference/ILayout.xml#getClientBounds
   * @function
   * @name getClientBounds
   * @returns {Number[][]} Координаты левого верхнего и правого нижнего углов шаблона относительно точки привязки.
   */
  getShape: function () {
    if(!this._isElement(this._$element)) {
      return MyBalloonLayout.superclass.getShape.call(this);
    }

    var position = this._$element.position();

    return new ymaps.shape.Rectangle(new ymaps.geometry.pixel.Rectangle([
      [position.left, position.top], [
        position.left + this._$element[0].offsetWidth,
        position.top + this._$element[0].offsetHeight + this._$element.find('.arrow')[0].offsetHeight
      ]
    ]));
  },

  /**
   * Проверяем наличие элемента (в ИЕ и Опере его еще может не быть).
   * @function
   * @private
   * @name _isElement
   * @param {jQuery} [element] Элемент.
   * @returns {Boolean} Флаг наличия.
   */
  _isElement: function (element) {
    return element && element[0] && element.find('.arrow')[0];
  }
});

},{"./settings.js":3,"./socket.js":4}],2:[function(require,module,exports){
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
          data: JSON.stringify({ "loc": coords })
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

},{"./balloon_layout.js":1,"./settings.js":3,"./socket.js":4}],3:[function(require,module,exports){
module.exports.setOptionsObjectManager = function(objectManager, balloonLayout, balloonContentLayout) {
  objectManager.objects.options.set('balloonOffset', [2, -50]);
  objectManager.objects.options.set('balloonShadow', false);
  objectManager.objects.options.set('balloonLayout', balloonLayout);
  objectManager.objects.options.set('balloonContentLayout', balloonContentLayout);
  objectManager.objects.options.set('balloonPanelMaxMapArea', 0);
  objectManager.objects.options.set('preset', 'islands#greenDotIcon');
  objectManager.clusters.options.set('preset', 'islands#greenClusterIcons');
}

module.exports.setSearchOptionsObjectManager = function(objectManager, balloonLayout, balloonContentLayout) {
  objectManager.objects.options.set('balloonOffset', [2, -50]);
  objectManager.objects.options.set('balloonShadow', false);
  objectManager.objects.options.set('balloonLayout', balloonLayout);
  objectManager.objects.options.set('balloonContentLayout', balloonContentLayout);
  objectManager.objects.options.set('balloonPanelMaxMapArea', 0);
  objectManager.objects.options.set('preset', 'islands#yellowDotIcon');
  objectManager.clusters.options.set('preset', 'islands#yellowClusterIcons');
}

module.exports.toggleAuthButtons = function() {
  $('#register').toggleClass('hidden');
  $('#login').toggleClass('hidden');
  $('#logout').toggleClass('hidden');
}

module.exports.connectionType = function() {
  var docUrl = document.URL;
  var url;

  if (docUrl.indexOf('http://') > -1) {
    connectionType = 'ws://';
  } else if (docUrl.indexOf('https://') > -1) {
    connectionType = 'wss://';
  } else {
    connectionType = 'ws://';
  }

  return connectionType;
}

module.exports.getCurrentUrl = function() {
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

},{}],4:[function(require,module,exports){
var config = require('./settings.js');

module.exports.connection = new WebSocket(config.connectionType() + config.getCurrentUrl() + "/hub");

var createNotify = function(title, text, type) {
  $.notify({
    title: "<strong>" + title + "</strong> ",
    message: text
  }, {
    offset: {
      x: 10,
      y: 100
    },
    newest_on_top: true,
    type: type
  });
}

module.exports.createNotify = createNotify;

module.exports.HintAdd = function(objectManager, message) {
  var obj = objectManager.objects.getById(message.id);
  if (obj) {
    obj.properties.hintContent = message.properties.hintContent
    if (message.properties.hintContent != "not available") {
      createNotify(
        "Point specifies it's address!",
        "It has following address: " + message.properties.hintContent,
        "success"
      );
    }
  }
}

module.exports.PointAdd = function(objectManager, message) {
  objectManager.add(message);
  createNotify(
    "New point was created!",
    "Find it on the map!",
    "success"
  );
}

module.exports.PointRemove = function(objectManager, message) {
  var obj = objectManager.objects.getById(message.id);
  if (obj) { objectManager.remove(obj); }

  createNotify(
    "Point was deleted!",
    "Somebody cleanups the map...",
    "warning"
  );
}

module.exports.balloonMessage = function(message, author, createdAt, messageId) {
  if (author == "") { author = "Unknown"; }
  return  '<li class="right clearfix" id="' + messageId + '">' +
            '<div class="chat-body clearfix">' +
                '<div class="header">' +
                    '<small class=" text-muted"><span class="glyphicon glyphicon-time"></span>' + createdAt + '</small>' +
                    '<strong class="pull-right primary-font">' + author + '</strong>' +
                '</div>' +
                '<p>' +
                    message +
                '</p>' +
            '</div>' +
        '</li>'
}

},{"./settings.js":3}]},{},[2]);
