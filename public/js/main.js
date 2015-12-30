(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var socket = require('./socket.js');

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
  var $chat = $('.chat');
  if (
    ($chat.html() == "Wait for data...") ||
    ($chat.html() == "There are no notes")
  ) {
    $chat.html(socket.balloonMessage(data.note, data.author, data.createdAt))
  } else {
    $chat.append(socket.balloonMessage(data.note, data.author, data.createdAt))
  }
};

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
    $('#point-id').val(this._data.object.id);

    this._$element = $('.panel', this.getParentElement());
    this.applyElementOffset();

    this._$element.find('.close').on('click', $.proxy(this.onCloseClick, this));
    $('#note-form').bind('submit', this.onNoteFormSubmit);
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

},{"./socket.js":4}],2:[function(require,module,exports){
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

module.exports.balloonMessage = function(message, author, createdAt) {
  return  '<li class="right clearfix">' +
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

},{}]},{},[2]);
