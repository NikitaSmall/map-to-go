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
    createNotify(
      "Point specifies it's address!",
      "It has following address: " + message.properties.hintContent,
      "success"
    );
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92NC4yLjEvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvYmFsbG9vbl9sYXlvdXQuanMiLCJwdWJsaWMvanMvbWFwLmpzIiwicHVibGljL2pzL3NldHRpbmdzLmpzIiwicHVibGljL2pzL3NvY2tldC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMuQ29udGVudExheW91dCA9IHltYXBzLnRlbXBsYXRlTGF5b3V0RmFjdG9yeS5jcmVhdGVDbGFzcyhcbiAgJzxkaXYgY2xhc3M9XCJwYW5lbC1mb290ZXJcIj4nICtcbiAgICAnPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwXCI+JyArXG4gICAgICAnPGlucHV0IGlkPVwiYnRuLWlucHV0XCIgdHlwZT1cInRleHRcIiBjbGFzcz1cImZvcm0tY29udHJvbCBpbnB1dC1zbVwiIHBsYWNlaG9sZGVyPVwiVHlwZSB5b3VyIG1lc3NhZ2UgaGVyZS4uLlwiIC8+JyArXG4gICAgICAnPHNwYW4gY2xhc3M9XCJpbnB1dC1ncm91cC1idG5cIj4nICtcbiAgICAgICAgJzxidXR0b24gY2xhc3M9XCJidG4gYnRuLXdhcm5pbmcgYnRuLXNtXCIgaWQ9XCJidG4tY2hhdFwiPicgK1xuICAgICAgICAgICdTZW5kPC9idXR0b24+JyArXG4gICAgICAnPC9zcGFuPicgK1xuICAgICAgJzxhIGNsYXNzPVwiY2xvc2VcIiBocmVmPVwiI1wiPiZ0aW1lczs8L2E+JyArXG4gICAgJzwvZGl2PicgK1xuICAnPC9kaXY+JyArXG4gICc8ZGl2IGNsYXNzPVwicGFuZWwtYm9keVwiPicgK1xuICAgICc8dWwgY2xhc3M9XCJjaGF0XCI+JyArXG4gICAgICAnJFtwcm9wZXJ0aWVzLmJhbGxvb25Db250ZW50XScgK1xuICAgICc8L3VsPicgK1xuICAnPC9kaXY+J1xuKTtcblxubW9kdWxlLmV4cG9ydHMuTGF5b3V0ID0geW1hcHMudGVtcGxhdGVMYXlvdXRGYWN0b3J5LmNyZWF0ZUNsYXNzKFxuICAnPGRpdiBjbGFzcz1cInBhbmVsIHBhbmVsLXByaW1hcnlcIj4nICtcbiAgICAnJFtbb3B0aW9ucy5jb250ZW50TGF5b3V0XV0nICtcbiAgICAnPGRpdiBjbGFzcz1cImFycm93XCI+PC9kaXY+JyArXG4gICc8L2Rpdj4nLCB7XG4gIC8qKlxuICAgKiDQodGC0YDQvtC40YIg0Y3QutC30LXQvNC/0LvRj9GAINC80LDQutC10YLQsCDQvdCwINC+0YHQvdC+0LLQtSDRiNCw0LHQu9C+0L3QsCDQuCDQtNC+0LHQsNCy0LvRj9C10YIg0LXQs9C+INCyINGA0L7QtNC40YLQtdC70YzRgdC60LjQuSBIVE1MLdGN0LvQtdC80LXQvdGCLlxuICAgKiBAc2VlIGh0dHBzOi8vYXBpLnlhbmRleC5ydS9tYXBzL2RvYy9qc2FwaS8yLjEvcmVmL3JlZmVyZW5jZS9sYXlvdXQudGVtcGxhdGVCYXNlZC5CYXNlLnhtbCNidWlsZFxuICAgKiBAZnVuY3Rpb25cbiAgICogQG5hbWUgYnVpbGRcbiAgICovXG4gIGJ1aWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5jb25zdHJ1Y3Rvci5zdXBlcmNsYXNzLmJ1aWxkLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fJGVsZW1lbnQgPSAkKCcucGFuZWwnLCB0aGlzLmdldFBhcmVudEVsZW1lbnQoKSk7XG4gICAgdGhpcy5hcHBseUVsZW1lbnRPZmZzZXQoKTtcblxuICAgIHRoaXMuXyRlbGVtZW50LmZpbmQoJy5jbG9zZScpLm9uKCdjbGljaycsICQucHJveHkodGhpcy5vbkNsb3NlQ2xpY2ssIHRoaXMpKTtcbiAgfSxcblxuICAvKipcbiAgICog0KPQtNCw0LvRj9C10YIg0YHQvtC00LXRgNC20LjQvNC+0LUg0LzQsNC60LXRgtCwINC40LcgRE9NLlxuICAgKiBAc2VlIGh0dHBzOi8vYXBpLnlhbmRleC5ydS9tYXBzL2RvYy9qc2FwaS8yLjEvcmVmL3JlZmVyZW5jZS9sYXlvdXQudGVtcGxhdGVCYXNlZC5CYXNlLnhtbCNjbGVhclxuICAgKiBAZnVuY3Rpb25cbiAgICogQG5hbWUgY2xlYXJcbiAgICovXG4gIGNsZWFyOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fJGVsZW1lbnQuZmluZCgnLmNsb3NlJykub2ZmKCdjbGljaycpO1xuICAgIHRoaXMuY29uc3RydWN0b3Iuc3VwZXJjbGFzcy5jbGVhci5jYWxsKHRoaXMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQnNC10YLQvtC0INCx0YPQtNC10YIg0LLRi9C30LLQsNC9INGB0LjRgdGC0LXQvNC+0Lkg0YjQsNCx0LvQvtC90L7QsiDQkNCf0Jgg0L/RgNC4INC40LfQvNC10L3QtdC90LjQuCDRgNCw0LfQvNC10YDQvtCyINCy0LvQvtC20LXQvdC90L7Qs9C+INC80LDQutC10YLQsC5cbiAgICogQHNlZSBodHRwczovL2FwaS55YW5kZXgucnUvbWFwcy9kb2MvanNhcGkvMi4xL3JlZi9yZWZlcmVuY2UvSUJhbGxvb25MYXlvdXQueG1sI2V2ZW50LXVzZXJjbG9zZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQG5hbWUgb25TdWJsYXlvdXRTaXplQ2hhbmdlXG4gICAqL1xuICBvblN1YmxheW91dFNpemVDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICBNeUJhbGxvb25MYXlvdXQuc3VwZXJjbGFzcy5vblN1YmxheW91dFNpemVDaGFuZ2UuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZighdGhpcy5faXNFbGVtZW50KHRoaXMuXyRlbGVtZW50KSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuYXBwbHlFbGVtZW50T2Zmc2V0KCk7XG4gICAgdGhpcy5ldmVudHMuZmlyZSgnc2hhcGVjaGFuZ2UnKTtcbiAgfSxcblxuICAvKipcbiAgICog0KHQtNCy0LjQs9Cw0LXQvCDQsdCw0LvRg9C9LCDRh9GC0L7QsdGLIFwi0YXQstC+0YHRgtC40LpcIiDRg9C60LDQt9GL0LLQsNC7INC90LAg0YLQvtGH0LrRgyDQv9GA0LjQstGP0LfQutC4LlxuICAgKiBAc2VlIGh0dHBzOi8vYXBpLnlhbmRleC5ydS9tYXBzL2RvYy9qc2FwaS8yLjEvcmVmL3JlZmVyZW5jZS9JQmFsbG9vbkxheW91dC54bWwjZXZlbnQtdXNlcmNsb3NlXG4gICAqIEBmdW5jdGlvblxuICAgKiBAbmFtZSBhcHBseUVsZW1lbnRPZmZzZXRcbiAgICovXG4gIGFwcGx5RWxlbWVudE9mZnNldDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuXyRlbGVtZW50LmNzcyh7XG4gICAgICBsZWZ0OiAtKHRoaXMuXyRlbGVtZW50WzBdLm9mZnNldFdpZHRoIC8gMiksXG4gICAgICB0b3A6IC0odGhpcy5fJGVsZW1lbnRbMF0ub2Zmc2V0SGVpZ2h0ICsgdGhpcy5fJGVsZW1lbnQuZmluZCgnLmFycm93JylbMF0ub2Zmc2V0SGVpZ2h0KVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQl9Cw0LrRgNGL0LLQsNC10YIg0LHQsNC70YPQvSDQv9GA0Lgg0LrQu9C40LrQtSDQvdCwINC60YDQtdGB0YLQuNC6LCDQutC40LTQsNGPINGB0L7QsdGL0YLQuNC1IFwidXNlcmNsb3NlXCIg0L3QsCDQvNCw0LrQtdGC0LUuXG4gICAqIEBzZWUgaHR0cHM6Ly9hcGkueWFuZGV4LnJ1L21hcHMvZG9jL2pzYXBpLzIuMS9yZWYvcmVmZXJlbmNlL0lCYWxsb29uTGF5b3V0LnhtbCNldmVudC11c2VyY2xvc2VcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBuYW1lIG9uQ2xvc2VDbGlja1xuICAgKi9cbiAgb25DbG9zZUNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB0aGlzLmV2ZW50cy5maXJlKCd1c2VyY2xvc2UnKTtcbiAgfSxcblxuICAvKipcbiAgICog0JjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINC00LvRjyDQsNCy0YLQvtC/0L7Qt9C40YbQuNC+0L3QuNGA0L7QstCw0L3QuNGPIChiYWxsb29uQXV0b1BhbikuXG4gICAqIEBzZWUgaHR0cHM6Ly9hcGkueWFuZGV4LnJ1L21hcHMvZG9jL2pzYXBpLzIuMS9yZWYvcmVmZXJlbmNlL0lMYXlvdXQueG1sI2dldENsaWVudEJvdW5kc1xuICAgKiBAZnVuY3Rpb25cbiAgICogQG5hbWUgZ2V0Q2xpZW50Qm91bmRzXG4gICAqIEByZXR1cm5zIHtOdW1iZXJbXVtdfSDQmtC+0L7RgNC00LjQvdCw0YLRiyDQu9C10LLQvtCz0L4g0LLQtdGA0YXQvdC10LPQviDQuCDQv9GA0LDQstC+0LPQviDQvdC40LbQvdC10LPQviDRg9Cz0LvQvtCyINGI0LDQsdC70L7QvdCwINC+0YLQvdC+0YHQuNGC0LXQu9GM0L3QviDRgtC+0YfQutC4INC/0YDQuNCy0Y/Qt9C60LguXG4gICAqL1xuICBnZXRTaGFwZTogZnVuY3Rpb24gKCkge1xuICAgIGlmKCF0aGlzLl9pc0VsZW1lbnQodGhpcy5fJGVsZW1lbnQpKSB7XG4gICAgICByZXR1cm4gTXlCYWxsb29uTGF5b3V0LnN1cGVyY2xhc3MuZ2V0U2hhcGUuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl8kZWxlbWVudC5wb3NpdGlvbigpO1xuXG4gICAgcmV0dXJuIG5ldyB5bWFwcy5zaGFwZS5SZWN0YW5nbGUobmV3IHltYXBzLmdlb21ldHJ5LnBpeGVsLlJlY3RhbmdsZShbXG4gICAgICBbcG9zaXRpb24ubGVmdCwgcG9zaXRpb24udG9wXSwgW1xuICAgICAgICBwb3NpdGlvbi5sZWZ0ICsgdGhpcy5fJGVsZW1lbnRbMF0ub2Zmc2V0V2lkdGgsXG4gICAgICAgIHBvc2l0aW9uLnRvcCArIHRoaXMuXyRlbGVtZW50WzBdLm9mZnNldEhlaWdodCArIHRoaXMuXyRlbGVtZW50LmZpbmQoJy5hcnJvdycpWzBdLm9mZnNldEhlaWdodFxuICAgICAgXVxuICAgIF0pKTtcbiAgfSxcblxuICAvKipcbiAgICog0J/RgNC+0LLQtdGA0Y/QtdC8INC90LDQu9C40YfQuNC1INGN0LvQtdC80LXQvdGC0LAgKNCyINCY0JUg0Lgg0J7Qv9C10YDQtSDQtdCz0L4g0LXRidC1INC80L7QttC10YIg0L3QtSDQsdGL0YLRjCkuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAbmFtZSBfaXNFbGVtZW50XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBbZWxlbWVudF0g0K3Qu9C10LzQtdC90YIuXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSDQpNC70LDQsyDQvdCw0LvQuNGH0LjRjy5cbiAgICovXG4gIF9pc0VsZW1lbnQ6IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgcmV0dXJuIGVsZW1lbnQgJiYgZWxlbWVudFswXSAmJiBlbGVtZW50LmZpbmQoJy5hcnJvdycpWzBdO1xuICB9XG59KTtcbiIsIlwidXNlIHN0cmljdFwiO1xueW1hcHMucmVhZHkoZnVuY3Rpb24oKSB7XG4gIC8vIGluaXRpYWwgd29ya1xuICB2YXIgYmFsbG9vbkxheW91dCA9IHJlcXVpcmUoJy4vYmFsbG9vbl9sYXlvdXQuanMnKTtcbiAgdmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4vc2V0dGluZ3MuanMnKTtcbiAgdmFyIHNvY2tldCA9IHJlcXVpcmUoJy4vc29ja2V0LmpzJyk7XG5cbiAgdmFyIGNvbm47XG5cbiAgdmFyIG1hcCA9IG5ldyB5bWFwcy5NYXAoJ21hcCcsIHtcbiAgICAvLyBbbGF0aXR1ZGUsIGxvbmdpdHVkZV1cbiAgICBjZW50ZXI6IFs0Ni4yMywgMzAuNDddLFxuICAgIHpvb206IDEwXG4gIH0pO1xuXG4gIHZhciBvYmplY3RNYW5hZ2VyID0gbmV3IHltYXBzLk9iamVjdE1hbmFnZXIoe1xuICAgIGNsdXN0ZXJpemU6IHRydWUsXG4gICAgZ3JpZFNpemU6IDMyXG4gIH0pO1xuXG4gIGNvbmZpZy5zZXRPcHRpb25zT2JqZWN0TWFuYWdlcihvYmplY3RNYW5hZ2VyLCBiYWxsb29uTGF5b3V0LkxheW91dCwgYmFsbG9vbkxheW91dC5Db250ZW50TGF5b3V0KTtcbiAgbWFwLmdlb09iamVjdHMuYWRkKG9iamVjdE1hbmFnZXIpO1xuXG4gIC8vIGdldCBhbGwgdGhlIHBvaW50c1xuICAkLmFqYXgoe1xuICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgdXJsOiAnL3BvaW50cycsXG4gICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiXG4gIH0pLmRvbmUoZnVuY3Rpb24oZGF0YSkge1xuICAgIG9iamVjdE1hbmFnZXIuYWRkKGRhdGEpO1xuICB9KTtcblxuICAvLyBjcmVhdGUgbmV3IHBvaW50XG4gIG1hcC5ldmVudHMuYWRkKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgY29vcmRzID0gZS5nZXQoJ2Nvb3JkcycpO1xuXG4gICAgJC5hamF4KHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgdXJsOiAnL3BvaW50cycsXG4gICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04XCIsXG4gICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeSh7IFwibG9jXCI6IGNvb3Jkcy5yZXZlcnNlKCkgfSlcbiAgICB9KS5kb25lKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIG9iamVjdE1hbmFnZXIuYWRkKGRhdGEpO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBkZWxldGUgcG9pbnRcbiAgb2JqZWN0TWFuYWdlci5vYmplY3RzLmV2ZW50cy5hZGQoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgb2JqZWN0SWQgPSBlLmdldCgnb2JqZWN0SWQnKTtcbiAgICB2YXIgb2JqZWN0ID0gb2JqZWN0TWFuYWdlci5vYmplY3RzLmdldEJ5SWQob2JqZWN0SWQpO1xuICAgIHZhciBjb29yZHMgPSBvYmplY3QuZ2VvbWV0cnkuY29vcmRpbmF0ZXMucmV2ZXJzZSgpO1xuXG4gICAgJC5hamF4KHtcbiAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICB1cmw6ICcvcG9pbnRzJyxcbiAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIixcbiAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KHsgXCJpZFwiOiBvYmplY3QuaWQsIFwibG9jXCI6IGNvb3JkcyB9KVxuICAgIH0pLmRvbmUoZnVuY3Rpb24oZGF0YSkge1xuICAgICAgb2JqZWN0TWFuYWdlci5yZW1vdmUob2JqZWN0KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gaG92ZXIgbW91c2Ugb3ZlciBwb2ludCBhbmQgZ2V0IGFkZHJlc3MgaWYgbmVlZGVkXG4gIG9iamVjdE1hbmFnZXIub2JqZWN0cy5ldmVudHMuYWRkKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oZSkge1xuICAgIHZhciBvYmplY3RJZCA9IGUuZ2V0KCdvYmplY3RJZCcpO1xuICAgIHZhciBvYmplY3QgPSBvYmplY3RNYW5hZ2VyLm9iamVjdHMuZ2V0QnlJZChvYmplY3RJZCk7XG4gICAgdmFyIGNvb3JkcyA9IG9iamVjdC5nZW9tZXRyeS5jb29yZGluYXRlcy5yZXZlcnNlKCk7XG5cbiAgICBpZiAob2JqZWN0LnByb3BlcnRpZXMuaGludENvbnRlbnQgPT0gXCJcIikge1xuICAgICAgJC5hamF4KHtcbiAgICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgICB1cmw6ICcvcG9pbnRzJyxcbiAgICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiLFxuICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeSh7IFwiaWRcIjogb2JqZWN0LmlkLCBcImxvY1wiOiBjb29yZHMgfSlcbiAgICAgIH0pLmRvbmUoZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBvYmplY3QucHJvcGVydGllcy5oaW50Q29udGVudCA9IGRhdGEubWVzc2FnZTtcbiAgICAgICAgb2JqZWN0TWFuYWdlci5vYmplY3RzLmhpbnQub3BlbihvYmplY3RJZCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIGlmICh3aW5kb3dbXCJXZWJTb2NrZXRcIl0pIHtcbiAgICBjb25uID0gbmV3IFdlYlNvY2tldChcIndzOi8vXCIgKyBjb25maWcuZ2V0Q3VycmVudFVybCgpICsgXCIvaHViXCIpO1xuXG4gICAgY29ubi5vbm9wZW4gPSBmdW5jdGlvbihlKSB7XG4gICAgICBzb2NrZXQuY3JlYXRlTm90aWZ5KFxuICAgICAgICBcIldlbGNvbWUhXCIsXG4gICAgICAgIFwiU29ja2V0IGNvbm5lY3Rpb24gdG8gc2VydmVyIHdhcyBzdWNjZXNzZnVsbHkgZXN0YWJsaXNoZWQhXCIsXG4gICAgICAgIFwiaW5mb1wiXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbm4ub25tZXNzYWdlID0gZnVuY3Rpb24oZSkge1xuICAgICAgdmFyIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGUuZGF0YSk7XG5cbiAgICAgIHN3aXRjaCAobWVzc2FnZS5hY3Rpb24pIHtcbiAgICAgICAgY2FzZSBcInBvaW50X2FkZFwiOlxuICAgICAgICAgIHNvY2tldC5Qb2ludEFkZChvYmplY3RNYW5hZ2VyLCBtZXNzYWdlLm1lc3NhZ2UpXG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJwb2ludF9yZW1vdmVcIjpcbiAgICAgICAgICBzb2NrZXQuUG9pbnRSZW1vdmUob2JqZWN0TWFuYWdlciwgbWVzc2FnZS5tZXNzYWdlKVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiaGludF9hZGRlZFwiOlxuICAgICAgICAgIHNvY2tldC5IaW50QWRkKG9iamVjdE1hbmFnZXIsIG1lc3NhZ2UubWVzc2FnZSlcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25uLm9uY2xvc2UgPSBmdW5jdGlvbihlKSB7XG4gICAgICBzb2NrZXQuY3JlYXRlTm90aWZ5KFxuICAgICAgICBcIlNvbWV0aGluZyBoYXBwZW5lZCFcIixcbiAgICAgICAgXCJTb2NrZXQgY29ubmVjdGlvbiB3YXMgY2xvc2VkIVwiLFxuICAgICAgICBcImRhbmdlclwiXG4gICAgICApO1xuICAgIH1cblxuICB9XG5cbn0pO1xuIiwibW9kdWxlLmV4cG9ydHMuc2V0T3B0aW9uc09iamVjdE1hbmFnZXIgPSBmdW5jdGlvbihvYmplY3RNYW5hZ2VyLCBiYWxsb29uTGF5b3V0LCBiYWxsb29uQ29udGVudExheW91dCkge1xuICBvYmplY3RNYW5hZ2VyLm9iamVjdHMub3B0aW9ucy5zZXQoJ2JhbGxvb25PZmZzZXQnLCBbMiwgLTUwXSk7XG4gIG9iamVjdE1hbmFnZXIub2JqZWN0cy5vcHRpb25zLnNldCgnYmFsbG9vblNoYWRvdycsIGZhbHNlKTtcbiAgb2JqZWN0TWFuYWdlci5vYmplY3RzLm9wdGlvbnMuc2V0KCdiYWxsb29uTGF5b3V0JywgYmFsbG9vbkxheW91dCk7XG4gIG9iamVjdE1hbmFnZXIub2JqZWN0cy5vcHRpb25zLnNldCgnYmFsbG9vbkNvbnRlbnRMYXlvdXQnLCBiYWxsb29uQ29udGVudExheW91dCk7XG4gIG9iamVjdE1hbmFnZXIub2JqZWN0cy5vcHRpb25zLnNldCgnYmFsbG9vblBhbmVsTWF4TWFwQXJlYScsIDApO1xuICBvYmplY3RNYW5hZ2VyLm9iamVjdHMub3B0aW9ucy5zZXQoJ3ByZXNldCcsICdpc2xhbmRzI2dyZWVuRG90SWNvbicpO1xuICBvYmplY3RNYW5hZ2VyLmNsdXN0ZXJzLm9wdGlvbnMuc2V0KCdwcmVzZXQnLCAnaXNsYW5kcyNncmVlbkNsdXN0ZXJJY29ucycpO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5nZXRDdXJyZW50VXJsID0gZnVuY3Rpb24oKSB7XG4gIHZhciBkb2NVcmwgPSBkb2N1bWVudC5VUkw7XG4gIHZhciB1cmw7XG5cbiAgaWYgKGRvY1VybC5pbmRleE9mKCdodHRwOi8vJykgPiAtMSkge1xuICAgIHVybCA9IGRvY1VybC5zdWJzdHJpbmcoNywgZG9jVXJsLmxlbmd0aCAtIDEpO1xuICB9IGVsc2UgaWYgKGRvY1VybC5pbmRleE9mKCdodHRwczovLycpID4gLTEpIHtcbiAgICB1cmwgPSBkb2NVcmwuc3Vic3RyaW5nKDgsIGRvY1VybC5sZW5ndGggLSAxKTtcbiAgfSBlbHNlIHtcbiAgICB1cmwgPSBkb2NVcmw7XG4gIH1cblxuICByZXR1cm4gdXJsO1xufVxuIiwidmFyIGNyZWF0ZU5vdGlmeSA9IGZ1bmN0aW9uKHRpdGxlLCB0ZXh0LCB0eXBlKSB7XG4gICQubm90aWZ5KHtcbiAgICB0aXRsZTogXCI8c3Ryb25nPlwiICsgdGl0bGUgKyBcIjwvc3Ryb25nPiBcIixcbiAgICBtZXNzYWdlOiB0ZXh0XG4gIH0sIHtcbiAgICBvZmZzZXQ6IHtcbiAgICAgIHg6IDEwLFxuICAgICAgeTogMTAwXG4gICAgfSxcbiAgICBuZXdlc3Rfb25fdG9wOiB0cnVlLFxuICAgIHR5cGU6IHR5cGVcbiAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZU5vdGlmeSA9IGNyZWF0ZU5vdGlmeTtcblxubW9kdWxlLmV4cG9ydHMuSGludEFkZCA9IGZ1bmN0aW9uKG9iamVjdE1hbmFnZXIsIG1lc3NhZ2UpIHtcbiAgdmFyIG9iaiA9IG9iamVjdE1hbmFnZXIub2JqZWN0cy5nZXRCeUlkKG1lc3NhZ2UuaWQpO1xuICBpZiAob2JqKSB7XG4gICAgb2JqLnByb3BlcnRpZXMuaGludENvbnRlbnQgPSBtZXNzYWdlLnByb3BlcnRpZXMuaGludENvbnRlbnRcbiAgICBjcmVhdGVOb3RpZnkoXG4gICAgICBcIlBvaW50IHNwZWNpZmllcyBpdCdzIGFkZHJlc3MhXCIsXG4gICAgICBcIkl0IGhhcyBmb2xsb3dpbmcgYWRkcmVzczogXCIgKyBtZXNzYWdlLnByb3BlcnRpZXMuaGludENvbnRlbnQsXG4gICAgICBcInN1Y2Nlc3NcIlxuICAgICk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMuUG9pbnRBZGQgPSBmdW5jdGlvbihvYmplY3RNYW5hZ2VyLCBtZXNzYWdlKSB7XG4gIG9iamVjdE1hbmFnZXIuYWRkKG1lc3NhZ2UpO1xuICBjcmVhdGVOb3RpZnkoXG4gICAgXCJOZXcgcG9pbnQgd2FzIGNyZWF0ZWQhXCIsXG4gICAgXCJGaW5kIGl0IG9uIHRoZSBtYXAhXCIsXG4gICAgXCJzdWNjZXNzXCJcbiAgKTtcbn1cblxubW9kdWxlLmV4cG9ydHMuUG9pbnRSZW1vdmUgPSBmdW5jdGlvbihvYmplY3RNYW5hZ2VyLCBtZXNzYWdlKSB7XG4gIHZhciBvYmogPSBvYmplY3RNYW5hZ2VyLm9iamVjdHMuZ2V0QnlJZChtZXNzYWdlLmlkKTtcbiAgaWYgKG9iaikgeyBvYmplY3RNYW5hZ2VyLnJlbW92ZShvYmopOyB9XG5cbiAgY3JlYXRlTm90aWZ5KFxuICAgIFwiUG9pbnQgd2FzIGRlbGV0ZWQhXCIsXG4gICAgXCJTb21lYm9keSBjbGVhbnVwcyB0aGUgbWFwLi4uXCIsXG4gICAgXCJ3YXJuaW5nXCJcbiAgKTtcbn1cblxubW9kdWxlLmV4cG9ydHMuYmFsbG9vbk1lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlLCBhdXRob3IsIGNyZWF0ZWRBdCkge1xuICByZXR1cm4gICc8bGkgY2xhc3M9XCJyaWdodCBjbGVhcmZpeFwiPicgK1xuICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJjaGF0LWJvZHkgY2xlYXJmaXhcIj4nICtcbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImhlYWRlclwiPicgK1xuICAgICAgICAgICAgICAgICAgICAnPHNtYWxsIGNsYXNzPVwiIHRleHQtbXV0ZWRcIj48c3BhbiBjbGFzcz1cImdseXBoaWNvbiBnbHlwaGljb24tdGltZVwiPjwvc3Bhbj4nICsgY3JlYXRlZEF0ICsgJzwvc21hbGw+JyArXG4gICAgICAgICAgICAgICAgICAgICc8c3Ryb25nIGNsYXNzPVwicHVsbC1yaWdodCBwcmltYXJ5LWZvbnRcIj4nICsgYXV0aG9yICsgJzwvc3Ryb25nPicgK1xuICAgICAgICAgICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAnPHA+JyArXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgK1xuICAgICAgICAgICAgICAgICc8L3A+JyArXG4gICAgICAgICAgICAnPC9kaXY+JyArXG4gICAgICAgICc8L2xpPidcbn1cbiJdfQ==
