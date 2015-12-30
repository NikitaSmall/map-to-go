(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports.ContentLayout = ymaps.templateLayoutFactory.createClass(
  '<div class="panel-footer">' +
    '<div class="input-group">' +
      '<input id="btn-input" type="text" class="form-control input-sm" placeholder="Type your message here..." />' +
      '<span class="input-group-btn">' +
        '<button class="btn btn-warning btn-sm" id="btn-chat">' +
          'Send</button>' +
      '</span>' +
      '<a class="close" href="#">&times;</a>' +
    '</div>' +
  '</div>' +
  '<div class="panel-body">' +
    '<ul class="chat">' +
      '$[properties.balloonContent]' +
    '</ul>' +
  '</div>'
);

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
    this._$element = $('.panel', this.getParentElement());
    this.applyElementOffset();

    this._$element.find('.close').on('click', $.proxy(this.onCloseClick, this));
  },

  /**
   * Удаляет содержимое макета из DOM.
   * @see https://api.yandex.ru/maps/doc/jsapi/2.1/ref/reference/layout.templateBased.Base.xml#clear
   * @function
   * @name clear
   */
  clear: function () {
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

},{}],2:[function(require,module,exports){
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
    });
  });

  // delete point
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

  // hover mouse over point and get address if needed
  objectManager.objects.events.add('mouseenter', function(e) {
    var objectId = e.get('objectId');
    var object = objectManager.objects.getById(objectId);
    var coords = object.geometry.coordinates.reverse();

    if (object.properties.hintContent == "") {
      $.ajax({
        method: 'PATCH',
        url: '/points',
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({ "id": object.id, "loc": coords })
      }).done(function(data) {
        object.properties.hintContent = data.message;
        objectManager.objects.hint.open(objectId);
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

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92NC4yLjEvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvYmFsbG9vbl9sYXlvdXQuanMiLCJwdWJsaWMvanMvbWFwLmpzIiwicHVibGljL2pzL3NldHRpbmdzLmpzIiwicHVibGljL2pzL3NvY2tldC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzLkNvbnRlbnRMYXlvdXQgPSB5bWFwcy50ZW1wbGF0ZUxheW91dEZhY3RvcnkuY3JlYXRlQ2xhc3MoXG4gICc8ZGl2IGNsYXNzPVwicGFuZWwtZm9vdGVyXCI+JyArXG4gICAgJzxkaXYgY2xhc3M9XCJpbnB1dC1ncm91cFwiPicgK1xuICAgICAgJzxpbnB1dCBpZD1cImJ0bi1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJmb3JtLWNvbnRyb2wgaW5wdXQtc21cIiBwbGFjZWhvbGRlcj1cIlR5cGUgeW91ciBtZXNzYWdlIGhlcmUuLi5cIiAvPicgK1xuICAgICAgJzxzcGFuIGNsYXNzPVwiaW5wdXQtZ3JvdXAtYnRuXCI+JyArXG4gICAgICAgICc8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi13YXJuaW5nIGJ0bi1zbVwiIGlkPVwiYnRuLWNoYXRcIj4nICtcbiAgICAgICAgICAnU2VuZDwvYnV0dG9uPicgK1xuICAgICAgJzwvc3Bhbj4nICtcbiAgICAgICc8YSBjbGFzcz1cImNsb3NlXCIgaHJlZj1cIiNcIj4mdGltZXM7PC9hPicgK1xuICAgICc8L2Rpdj4nICtcbiAgJzwvZGl2PicgK1xuICAnPGRpdiBjbGFzcz1cInBhbmVsLWJvZHlcIj4nICtcbiAgICAnPHVsIGNsYXNzPVwiY2hhdFwiPicgK1xuICAgICAgJyRbcHJvcGVydGllcy5iYWxsb29uQ29udGVudF0nICtcbiAgICAnPC91bD4nICtcbiAgJzwvZGl2Pidcbik7XG5cbm1vZHVsZS5leHBvcnRzLkxheW91dCA9IHltYXBzLnRlbXBsYXRlTGF5b3V0RmFjdG9yeS5jcmVhdGVDbGFzcyhcbiAgJzxkaXYgY2xhc3M9XCJwYW5lbCBwYW5lbC1wcmltYXJ5XCI+JyArXG4gICAgJyRbW29wdGlvbnMuY29udGVudExheW91dF1dJyArXG4gICAgJzxkaXYgY2xhc3M9XCJhcnJvd1wiPjwvZGl2PicgK1xuICAnPC9kaXY+Jywge1xuICAvKipcbiAgICog0KHRgtGA0L7QuNGCINGN0LrQt9C10LzQv9C70Y/RgCDQvNCw0LrQtdGC0LAg0L3QsCDQvtGB0L3QvtCy0LUg0YjQsNCx0LvQvtC90LAg0Lgg0LTQvtCx0LDQstC70Y/QtdGCINC10LPQviDQsiDRgNC+0LTQuNGC0LXQu9GM0YHQutC40LkgSFRNTC3RjdC70LXQvNC10L3Rgi5cbiAgICogQHNlZSBodHRwczovL2FwaS55YW5kZXgucnUvbWFwcy9kb2MvanNhcGkvMi4xL3JlZi9yZWZlcmVuY2UvbGF5b3V0LnRlbXBsYXRlQmFzZWQuQmFzZS54bWwjYnVpbGRcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBuYW1lIGJ1aWxkXG4gICAqL1xuICBidWlsZDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuY29uc3RydWN0b3Iuc3VwZXJjbGFzcy5idWlsZC5jYWxsKHRoaXMpO1xuICAgIHRoaXMuXyRlbGVtZW50ID0gJCgnLnBhbmVsJywgdGhpcy5nZXRQYXJlbnRFbGVtZW50KCkpO1xuICAgIHRoaXMuYXBwbHlFbGVtZW50T2Zmc2V0KCk7XG5cbiAgICB0aGlzLl8kZWxlbWVudC5maW5kKCcuY2xvc2UnKS5vbignY2xpY2snLCAkLnByb3h5KHRoaXMub25DbG9zZUNsaWNrLCB0aGlzKSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCj0LTQsNC70Y/QtdGCINGB0L7QtNC10YDQttC40LzQvtC1INC80LDQutC10YLQsCDQuNC3IERPTS5cbiAgICogQHNlZSBodHRwczovL2FwaS55YW5kZXgucnUvbWFwcy9kb2MvanNhcGkvMi4xL3JlZi9yZWZlcmVuY2UvbGF5b3V0LnRlbXBsYXRlQmFzZWQuQmFzZS54bWwjY2xlYXJcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBuYW1lIGNsZWFyXG4gICAqL1xuICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuXyRlbGVtZW50LmZpbmQoJy5jbG9zZScpLm9mZignY2xpY2snKTtcbiAgICB0aGlzLmNvbnN0cnVjdG9yLnN1cGVyY2xhc3MuY2xlYXIuY2FsbCh0aGlzKTtcbiAgfSxcblxuICAvKipcbiAgICog0JzQtdGC0L7QtCDQsdGD0LTQtdGCINCy0YvQt9Cy0LDQvSDRgdC40YHRgtC10LzQvtC5INGI0LDQsdC70L7QvdC+0LIg0JDQn9CYINC/0YDQuCDQuNC30LzQtdC90LXQvdC40Lgg0YDQsNC30LzQtdGA0L7QsiDQstC70L7QttC10L3QvdC+0LPQviDQvNCw0LrQtdGC0LAuXG4gICAqIEBzZWUgaHR0cHM6Ly9hcGkueWFuZGV4LnJ1L21hcHMvZG9jL2pzYXBpLzIuMS9yZWYvcmVmZXJlbmNlL0lCYWxsb29uTGF5b3V0LnhtbCNldmVudC11c2VyY2xvc2VcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBuYW1lIG9uU3VibGF5b3V0U2l6ZUNoYW5nZVxuICAgKi9cbiAgb25TdWJsYXlvdXRTaXplQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgTXlCYWxsb29uTGF5b3V0LnN1cGVyY2xhc3Mub25TdWJsYXlvdXRTaXplQ2hhbmdlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYoIXRoaXMuX2lzRWxlbWVudCh0aGlzLl8kZWxlbWVudCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmFwcGx5RWxlbWVudE9mZnNldCgpO1xuICAgIHRoaXMuZXZlbnRzLmZpcmUoJ3NoYXBlY2hhbmdlJyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCh0LTQstC40LPQsNC10Lwg0LHQsNC70YPQvSwg0YfRgtC+0LHRiyBcItGF0LLQvtGB0YLQuNC6XCIg0YPQutCw0LfRi9Cy0LDQuyDQvdCwINGC0L7Rh9C60YMg0L/RgNC40LLRj9C30LrQuC5cbiAgICogQHNlZSBodHRwczovL2FwaS55YW5kZXgucnUvbWFwcy9kb2MvanNhcGkvMi4xL3JlZi9yZWZlcmVuY2UvSUJhbGxvb25MYXlvdXQueG1sI2V2ZW50LXVzZXJjbG9zZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQG5hbWUgYXBwbHlFbGVtZW50T2Zmc2V0XG4gICAqL1xuICBhcHBseUVsZW1lbnRPZmZzZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl8kZWxlbWVudC5jc3Moe1xuICAgICAgbGVmdDogLSh0aGlzLl8kZWxlbWVudFswXS5vZmZzZXRXaWR0aCAvIDIpLFxuICAgICAgdG9wOiAtKHRoaXMuXyRlbGVtZW50WzBdLm9mZnNldEhlaWdodCArIHRoaXMuXyRlbGVtZW50LmZpbmQoJy5hcnJvdycpWzBdLm9mZnNldEhlaWdodClcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICog0JfQsNC60YDRi9Cy0LDQtdGCINCx0LDQu9GD0L0g0L/RgNC4INC60LvQuNC60LUg0L3QsCDQutGA0LXRgdGC0LjQuiwg0LrQuNC00LDRjyDRgdC+0LHRi9GC0LjQtSBcInVzZXJjbG9zZVwiINC90LAg0LzQsNC60LXRgtC1LlxuICAgKiBAc2VlIGh0dHBzOi8vYXBpLnlhbmRleC5ydS9tYXBzL2RvYy9qc2FwaS8yLjEvcmVmL3JlZmVyZW5jZS9JQmFsbG9vbkxheW91dC54bWwjZXZlbnQtdXNlcmNsb3NlXG4gICAqIEBmdW5jdGlvblxuICAgKiBAbmFtZSBvbkNsb3NlQ2xpY2tcbiAgICovXG4gIG9uQ2xvc2VDbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgdGhpcy5ldmVudHMuZmlyZSgndXNlcmNsb3NlJyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCY0YHQv9C+0LvRjNC30YPQtdGC0YHRjyDQtNC70Y8g0LDQstGC0L7Qv9C+0LfQuNGG0LjQvtC90LjRgNC+0LLQsNC90LjRjyAoYmFsbG9vbkF1dG9QYW4pLlxuICAgKiBAc2VlIGh0dHBzOi8vYXBpLnlhbmRleC5ydS9tYXBzL2RvYy9qc2FwaS8yLjEvcmVmL3JlZmVyZW5jZS9JTGF5b3V0LnhtbCNnZXRDbGllbnRCb3VuZHNcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBuYW1lIGdldENsaWVudEJvdW5kc1xuICAgKiBAcmV0dXJucyB7TnVtYmVyW11bXX0g0JrQvtC+0YDQtNC40L3QsNGC0Ysg0LvQtdCy0L7Qs9C+INCy0LXRgNGF0L3QtdCz0L4g0Lgg0L/RgNCw0LLQvtCz0L4g0L3QuNC20L3QtdCz0L4g0YPQs9C70L7QsiDRiNCw0LHQu9C+0L3QsCDQvtGC0L3QvtGB0LjRgtC10LvRjNC90L4g0YLQvtGH0LrQuCDQv9GA0LjQstGP0LfQutC4LlxuICAgKi9cbiAgZ2V0U2hhcGU6IGZ1bmN0aW9uICgpIHtcbiAgICBpZighdGhpcy5faXNFbGVtZW50KHRoaXMuXyRlbGVtZW50KSkge1xuICAgICAgcmV0dXJuIE15QmFsbG9vbkxheW91dC5zdXBlcmNsYXNzLmdldFNoYXBlLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5fJGVsZW1lbnQucG9zaXRpb24oKTtcblxuICAgIHJldHVybiBuZXcgeW1hcHMuc2hhcGUuUmVjdGFuZ2xlKG5ldyB5bWFwcy5nZW9tZXRyeS5waXhlbC5SZWN0YW5nbGUoW1xuICAgICAgW3Bvc2l0aW9uLmxlZnQsIHBvc2l0aW9uLnRvcF0sIFtcbiAgICAgICAgcG9zaXRpb24ubGVmdCArIHRoaXMuXyRlbGVtZW50WzBdLm9mZnNldFdpZHRoLFxuICAgICAgICBwb3NpdGlvbi50b3AgKyB0aGlzLl8kZWxlbWVudFswXS5vZmZzZXRIZWlnaHQgKyB0aGlzLl8kZWxlbWVudC5maW5kKCcuYXJyb3cnKVswXS5vZmZzZXRIZWlnaHRcbiAgICAgIF1cbiAgICBdKSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCf0YDQvtCy0LXRgNGP0LXQvCDQvdCw0LvQuNGH0LjQtSDRjdC70LXQvNC10L3RgtCwICjQsiDQmNCVINC4INCe0L/QtdGA0LUg0LXQs9C+INC10YnQtSDQvNC+0LbQtdGCINC90LUg0LHRi9GC0YwpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQG5hbWUgX2lzRWxlbWVudFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gW2VsZW1lbnRdINCt0LvQtdC80LXQvdGCLlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0g0KTQu9Cw0LMg0L3QsNC70LjRh9C40Y8uXG4gICAqL1xuICBfaXNFbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHJldHVybiBlbGVtZW50ICYmIGVsZW1lbnRbMF0gJiYgZWxlbWVudC5maW5kKCcuYXJyb3cnKVswXTtcbiAgfVxufSk7XG4iLCJcInVzZSBzdHJpY3RcIjtcbnltYXBzLnJlYWR5KGZ1bmN0aW9uKCkge1xuICAvLyBpbml0aWFsIHdvcmtcbiAgdmFyIGJhbGxvb25MYXlvdXQgPSByZXF1aXJlKCcuL2JhbGxvb25fbGF5b3V0LmpzJyk7XG4gIHZhciBjb25maWcgPSByZXF1aXJlKCcuL3NldHRpbmdzLmpzJyk7XG4gIHZhciBzb2NrZXQgPSByZXF1aXJlKCcuL3NvY2tldC5qcycpO1xuXG4gIHZhciBjb25uO1xuXG4gIHZhciBtYXAgPSBuZXcgeW1hcHMuTWFwKCdtYXAnLCB7XG4gICAgLy8gW2xhdGl0dWRlLCBsb25naXR1ZGVdXG4gICAgY2VudGVyOiBbNDYuMjMsIDMwLjQ3XSxcbiAgICB6b29tOiAxMFxuICB9KTtcblxuICB2YXIgb2JqZWN0TWFuYWdlciA9IG5ldyB5bWFwcy5PYmplY3RNYW5hZ2VyKHtcbiAgICBjbHVzdGVyaXplOiB0cnVlLFxuICAgIGdyaWRTaXplOiAzMlxuICB9KTtcblxuICBjb25maWcuc2V0T3B0aW9uc09iamVjdE1hbmFnZXIob2JqZWN0TWFuYWdlciwgYmFsbG9vbkxheW91dC5MYXlvdXQsIGJhbGxvb25MYXlvdXQuQ29udGVudExheW91dCk7XG4gIG1hcC5nZW9PYmplY3RzLmFkZChvYmplY3RNYW5hZ2VyKTtcblxuICAvLyBnZXQgYWxsIHRoZSBwb2ludHNcbiAgJC5hamF4KHtcbiAgICBtZXRob2Q6ICdHRVQnLFxuICAgIHVybDogJy9wb2ludHMnLFxuICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIlxuICB9KS5kb25lKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBvYmplY3RNYW5hZ2VyLmFkZChkYXRhKTtcbiAgfSk7XG5cbiAgLy8gY3JlYXRlIG5ldyBwb2ludFxuICBtYXAuZXZlbnRzLmFkZCgnY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgdmFyIGNvb3JkcyA9IGUuZ2V0KCdjb29yZHMnKTtcblxuICAgICQuYWpheCh7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIHVybDogJy9wb2ludHMnLFxuICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiLFxuICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoeyBcImxvY1wiOiBjb29yZHMucmV2ZXJzZSgpIH0pXG4gICAgfSkuZG9uZShmdW5jdGlvbihkYXRhKSB7XG4gICAgICBvYmplY3RNYW5hZ2VyLmFkZChkYXRhKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gZGVsZXRlIHBvaW50XG4gIG9iamVjdE1hbmFnZXIub2JqZWN0cy5ldmVudHMuYWRkKCdjb250ZXh0bWVudScsIGZ1bmN0aW9uIChlKSB7XG4gICAgdmFyIG9iamVjdElkID0gZS5nZXQoJ29iamVjdElkJyk7XG4gICAgdmFyIG9iamVjdCA9IG9iamVjdE1hbmFnZXIub2JqZWN0cy5nZXRCeUlkKG9iamVjdElkKTtcbiAgICB2YXIgY29vcmRzID0gb2JqZWN0Lmdlb21ldHJ5LmNvb3JkaW5hdGVzLnJldmVyc2UoKTtcblxuICAgICQuYWpheCh7XG4gICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgdXJsOiAnL3BvaW50cycsXG4gICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04XCIsXG4gICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeSh7IFwiaWRcIjogb2JqZWN0LmlkLCBcImxvY1wiOiBjb29yZHMgfSlcbiAgICB9KS5kb25lKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIG9iamVjdE1hbmFnZXIucmVtb3ZlKG9iamVjdCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIGhvdmVyIG1vdXNlIG92ZXIgcG9pbnQgYW5kIGdldCBhZGRyZXNzIGlmIG5lZWRlZFxuICBvYmplY3RNYW5hZ2VyLm9iamVjdHMuZXZlbnRzLmFkZCgnbW91c2VlbnRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgb2JqZWN0SWQgPSBlLmdldCgnb2JqZWN0SWQnKTtcbiAgICB2YXIgb2JqZWN0ID0gb2JqZWN0TWFuYWdlci5vYmplY3RzLmdldEJ5SWQob2JqZWN0SWQpO1xuICAgIHZhciBjb29yZHMgPSBvYmplY3QuZ2VvbWV0cnkuY29vcmRpbmF0ZXMucmV2ZXJzZSgpO1xuXG4gICAgaWYgKG9iamVjdC5wcm9wZXJ0aWVzLmhpbnRDb250ZW50ID09IFwiXCIpIHtcbiAgICAgICQuYWpheCh7XG4gICAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgICAgdXJsOiAnL3BvaW50cycsXG4gICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIixcbiAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoeyBcImlkXCI6IG9iamVjdC5pZCwgXCJsb2NcIjogY29vcmRzIH0pXG4gICAgICB9KS5kb25lKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgb2JqZWN0LnByb3BlcnRpZXMuaGludENvbnRlbnQgPSBkYXRhLm1lc3NhZ2U7XG4gICAgICAgIG9iamVjdE1hbmFnZXIub2JqZWN0cy5oaW50Lm9wZW4ob2JqZWN0SWQpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICBpZiAod2luZG93W1wiV2ViU29ja2V0XCJdKSB7XG4gICAgY29ubiA9IG5ldyBXZWJTb2NrZXQoXCJ3czovL1wiICsgY29uZmlnLmdldEN1cnJlbnRVcmwoKSArIFwiL2h1YlwiKTtcblxuICAgIGNvbm4ub25vcGVuID0gZnVuY3Rpb24oZSkge1xuICAgICAgc29ja2V0LmNyZWF0ZU5vdGlmeShcbiAgICAgICAgXCJXZWxjb21lIVwiLFxuICAgICAgICBcIlNvY2tldCBjb25uZWN0aW9uIHRvIHNlcnZlciB3YXMgc3VjY2Vzc2Z1bGx5IGVzdGFibGlzaGVkIVwiLFxuICAgICAgICBcImluZm9cIlxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25uLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciBtZXNzYWdlID0gSlNPTi5wYXJzZShlLmRhdGEpO1xuXG4gICAgICBzd2l0Y2ggKG1lc3NhZ2UuYWN0aW9uKSB7XG4gICAgICAgIGNhc2UgXCJwb2ludF9hZGRcIjpcbiAgICAgICAgICBzb2NrZXQuUG9pbnRBZGQob2JqZWN0TWFuYWdlciwgbWVzc2FnZS5tZXNzYWdlKVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwicG9pbnRfcmVtb3ZlXCI6XG4gICAgICAgICAgc29ja2V0LlBvaW50UmVtb3ZlKG9iamVjdE1hbmFnZXIsIG1lc3NhZ2UubWVzc2FnZSlcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcImhpbnRfYWRkZWRcIjpcbiAgICAgICAgICBzb2NrZXQuSGludEFkZChvYmplY3RNYW5hZ2VyLCBtZXNzYWdlLm1lc3NhZ2UpXG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29ubi5vbmNsb3NlID0gZnVuY3Rpb24oZSkge1xuICAgICAgc29ja2V0LmNyZWF0ZU5vdGlmeShcbiAgICAgICAgXCJTb21ldGhpbmcgaGFwcGVuZWQhXCIsXG4gICAgICAgIFwiU29ja2V0IGNvbm5lY3Rpb24gd2FzIGNsb3NlZCFcIixcbiAgICAgICAgXCJkYW5nZXJcIlxuICAgICAgKTtcbiAgICB9XG5cbiAgfVxuXG59KTtcbiIsIm1vZHVsZS5leHBvcnRzLnNldE9wdGlvbnNPYmplY3RNYW5hZ2VyID0gZnVuY3Rpb24ob2JqZWN0TWFuYWdlciwgYmFsbG9vbkxheW91dCwgYmFsbG9vbkNvbnRlbnRMYXlvdXQpIHtcbiAgb2JqZWN0TWFuYWdlci5vYmplY3RzLm9wdGlvbnMuc2V0KCdiYWxsb29uT2Zmc2V0JywgWzIsIC01MF0pO1xuICBvYmplY3RNYW5hZ2VyLm9iamVjdHMub3B0aW9ucy5zZXQoJ2JhbGxvb25TaGFkb3cnLCBmYWxzZSk7XG4gIG9iamVjdE1hbmFnZXIub2JqZWN0cy5vcHRpb25zLnNldCgnYmFsbG9vbkxheW91dCcsIGJhbGxvb25MYXlvdXQpO1xuICBvYmplY3RNYW5hZ2VyLm9iamVjdHMub3B0aW9ucy5zZXQoJ2JhbGxvb25Db250ZW50TGF5b3V0JywgYmFsbG9vbkNvbnRlbnRMYXlvdXQpO1xuICBvYmplY3RNYW5hZ2VyLm9iamVjdHMub3B0aW9ucy5zZXQoJ2JhbGxvb25QYW5lbE1heE1hcEFyZWEnLCAwKTtcbiAgb2JqZWN0TWFuYWdlci5vYmplY3RzLm9wdGlvbnMuc2V0KCdwcmVzZXQnLCAnaXNsYW5kcyNncmVlbkRvdEljb24nKTtcbiAgb2JqZWN0TWFuYWdlci5jbHVzdGVycy5vcHRpb25zLnNldCgncHJlc2V0JywgJ2lzbGFuZHMjZ3JlZW5DbHVzdGVySWNvbnMnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMuZ2V0Q3VycmVudFVybCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZG9jVXJsID0gZG9jdW1lbnQuVVJMO1xuICB2YXIgdXJsO1xuXG4gIGlmIChkb2NVcmwuaW5kZXhPZignaHR0cDovLycpID4gLTEpIHtcbiAgICB1cmwgPSBkb2NVcmwuc3Vic3RyaW5nKDcsIGRvY1VybC5sZW5ndGggLSAxKTtcbiAgfSBlbHNlIGlmIChkb2NVcmwuaW5kZXhPZignaHR0cHM6Ly8nKSA+IC0xKSB7XG4gICAgdXJsID0gZG9jVXJsLnN1YnN0cmluZyg4LCBkb2NVcmwubGVuZ3RoIC0gMSk7XG4gIH0gZWxzZSB7XG4gICAgdXJsID0gZG9jVXJsO1xuICB9XG5cbiAgcmV0dXJuIHVybDtcbn1cbiIsInZhciBjcmVhdGVOb3RpZnkgPSBmdW5jdGlvbih0aXRsZSwgdGV4dCwgdHlwZSkge1xuICAkLm5vdGlmeSh7XG4gICAgdGl0bGU6IFwiPHN0cm9uZz5cIiArIHRpdGxlICsgXCI8L3N0cm9uZz4gXCIsXG4gICAgbWVzc2FnZTogdGV4dFxuICB9LCB7XG4gICAgb2Zmc2V0OiB7XG4gICAgICB4OiAxMCxcbiAgICAgIHk6IDEwMFxuICAgIH0sXG4gICAgbmV3ZXN0X29uX3RvcDogdHJ1ZSxcbiAgICB0eXBlOiB0eXBlXG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVOb3RpZnkgPSBjcmVhdGVOb3RpZnk7XG5cbm1vZHVsZS5leHBvcnRzLkhpbnRBZGQgPSBmdW5jdGlvbihvYmplY3RNYW5hZ2VyLCBtZXNzYWdlKSB7XG4gIHZhciBvYmogPSBvYmplY3RNYW5hZ2VyLm9iamVjdHMuZ2V0QnlJZChtZXNzYWdlLmlkKTtcbiAgaWYgKG9iaikge1xuICAgIG9iai5wcm9wZXJ0aWVzLmhpbnRDb250ZW50ID0gbWVzc2FnZS5wcm9wZXJ0aWVzLmhpbnRDb250ZW50XG4gICAgaWYgKG1lc3NhZ2UucHJvcGVydGllcy5oaW50Q29udGVudCAhPSBcIm5vdCBhdmFpbGFibGVcIikge1xuICAgICAgY3JlYXRlTm90aWZ5KFxuICAgICAgICBcIlBvaW50IHNwZWNpZmllcyBpdCdzIGFkZHJlc3MhXCIsXG4gICAgICAgIFwiSXQgaGFzIGZvbGxvd2luZyBhZGRyZXNzOiBcIiArIG1lc3NhZ2UucHJvcGVydGllcy5oaW50Q29udGVudCxcbiAgICAgICAgXCJzdWNjZXNzXCJcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzLlBvaW50QWRkID0gZnVuY3Rpb24ob2JqZWN0TWFuYWdlciwgbWVzc2FnZSkge1xuICBvYmplY3RNYW5hZ2VyLmFkZChtZXNzYWdlKTtcbiAgY3JlYXRlTm90aWZ5KFxuICAgIFwiTmV3IHBvaW50IHdhcyBjcmVhdGVkIVwiLFxuICAgIFwiRmluZCBpdCBvbiB0aGUgbWFwIVwiLFxuICAgIFwic3VjY2Vzc1wiXG4gICk7XG59XG5cbm1vZHVsZS5leHBvcnRzLlBvaW50UmVtb3ZlID0gZnVuY3Rpb24ob2JqZWN0TWFuYWdlciwgbWVzc2FnZSkge1xuICB2YXIgb2JqID0gb2JqZWN0TWFuYWdlci5vYmplY3RzLmdldEJ5SWQobWVzc2FnZS5pZCk7XG4gIGlmIChvYmopIHsgb2JqZWN0TWFuYWdlci5yZW1vdmUob2JqKTsgfVxuXG4gIGNyZWF0ZU5vdGlmeShcbiAgICBcIlBvaW50IHdhcyBkZWxldGVkIVwiLFxuICAgIFwiU29tZWJvZHkgY2xlYW51cHMgdGhlIG1hcC4uLlwiLFxuICAgIFwid2FybmluZ1wiXG4gICk7XG59XG5cbm1vZHVsZS5leHBvcnRzLmJhbGxvb25NZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSwgYXV0aG9yLCBjcmVhdGVkQXQpIHtcbiAgcmV0dXJuICAnPGxpIGNsYXNzPVwicmlnaHQgY2xlYXJmaXhcIj4nICtcbiAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiY2hhdC1ib2R5IGNsZWFyZml4XCI+JyArXG4gICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJoZWFkZXJcIj4nICtcbiAgICAgICAgICAgICAgICAgICAgJzxzbWFsbCBjbGFzcz1cIiB0ZXh0LW11dGVkXCI+PHNwYW4gY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLXRpbWVcIj48L3NwYW4+JyArIGNyZWF0ZWRBdCArICc8L3NtYWxsPicgK1xuICAgICAgICAgICAgICAgICAgICAnPHN0cm9uZyBjbGFzcz1cInB1bGwtcmlnaHQgcHJpbWFyeS1mb250XCI+JyArIGF1dGhvciArICc8L3N0cm9uZz4nICtcbiAgICAgICAgICAgICAgICAnPC9kaXY+JyArXG4gICAgICAgICAgICAgICAgJzxwPicgK1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICtcbiAgICAgICAgICAgICAgICAnPC9wPicgK1xuICAgICAgICAgICAgJzwvZGl2PicgK1xuICAgICAgICAnPC9saT4nXG59XG4iXX0=
