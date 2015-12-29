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
    conn = new WebSocket("ws://" + config.getCurrentUrl() + "/hub");

    conn.onopen = function(e) {
      socket.createNotify(
        "<strong>Welcome!</strong>",
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
      }
    }

    conn.onclose = function(e) {
      socket.createNotify(
        "<strong>Something happened!</strong>",
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
    title: title + " ",
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92NC4yLjEvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvYmFsbG9vbl9sYXlvdXQuanMiLCJwdWJsaWMvanMvbWFwLmpzIiwicHVibGljL2pzL3NldHRpbmdzLmpzIiwicHVibGljL2pzL3NvY2tldC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cy5Db250ZW50TGF5b3V0ID0geW1hcHMudGVtcGxhdGVMYXlvdXRGYWN0b3J5LmNyZWF0ZUNsYXNzKFxuICAnPGRpdiBjbGFzcz1cInBhbmVsLWZvb3RlclwiPicgK1xuICAgICc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXBcIj4nICtcbiAgICAgICc8aW5wdXQgaWQ9XCJidG4taW5wdXRcIiB0eXBlPVwidGV4dFwiIGNsYXNzPVwiZm9ybS1jb250cm9sIGlucHV0LXNtXCIgcGxhY2Vob2xkZXI9XCJUeXBlIHlvdXIgbWVzc2FnZSBoZXJlLi4uXCIgLz4nICtcbiAgICAgICc8c3BhbiBjbGFzcz1cImlucHV0LWdyb3VwLWJ0blwiPicgK1xuICAgICAgICAnPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4td2FybmluZyBidG4tc21cIiBpZD1cImJ0bi1jaGF0XCI+JyArXG4gICAgICAgICAgJ1NlbmQ8L2J1dHRvbj4nICtcbiAgICAgICc8L3NwYW4+JyArXG4gICAgICAnPGEgY2xhc3M9XCJjbG9zZVwiIGhyZWY9XCIjXCI+JnRpbWVzOzwvYT4nICtcbiAgICAnPC9kaXY+JyArXG4gICc8L2Rpdj4nICtcbiAgJzxkaXYgY2xhc3M9XCJwYW5lbC1ib2R5XCI+JyArXG4gICAgJzx1bCBjbGFzcz1cImNoYXRcIj4nICtcbiAgICAgICckW3Byb3BlcnRpZXMuYmFsbG9vbkNvbnRlbnRdJyArXG4gICAgJzwvdWw+JyArXG4gICc8L2Rpdj4nXG4pO1xuXG5tb2R1bGUuZXhwb3J0cy5MYXlvdXQgPSB5bWFwcy50ZW1wbGF0ZUxheW91dEZhY3RvcnkuY3JlYXRlQ2xhc3MoXG4gICc8ZGl2IGNsYXNzPVwicGFuZWwgcGFuZWwtcHJpbWFyeVwiPicgK1xuICAgICckW1tvcHRpb25zLmNvbnRlbnRMYXlvdXRdXScgK1xuICAgICc8ZGl2IGNsYXNzPVwiYXJyb3dcIj48L2Rpdj4nICtcbiAgJzwvZGl2PicsIHtcbiAgLyoqXG4gICAqINCh0YLRgNC+0LjRgiDRjdC60LfQtdC80L/Qu9GP0YAg0LzQsNC60LXRgtCwINC90LAg0L7RgdC90L7QstC1INGI0LDQsdC70L7QvdCwINC4INC00L7QsdCw0LLQu9GP0LXRgiDQtdCz0L4g0LIg0YDQvtC00LjRgtC10LvRjNGB0LrQuNC5IEhUTUwt0Y3Qu9C10LzQtdC90YIuXG4gICAqIEBzZWUgaHR0cHM6Ly9hcGkueWFuZGV4LnJ1L21hcHMvZG9jL2pzYXBpLzIuMS9yZWYvcmVmZXJlbmNlL2xheW91dC50ZW1wbGF0ZUJhc2VkLkJhc2UueG1sI2J1aWxkXG4gICAqIEBmdW5jdGlvblxuICAgKiBAbmFtZSBidWlsZFxuICAgKi9cbiAgYnVpbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmNvbnN0cnVjdG9yLnN1cGVyY2xhc3MuYnVpbGQuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl8kZWxlbWVudCA9ICQoJy5wYW5lbCcsIHRoaXMuZ2V0UGFyZW50RWxlbWVudCgpKTtcbiAgICB0aGlzLmFwcGx5RWxlbWVudE9mZnNldCgpO1xuXG4gICAgdGhpcy5fJGVsZW1lbnQuZmluZCgnLmNsb3NlJykub24oJ2NsaWNrJywgJC5wcm94eSh0aGlzLm9uQ2xvc2VDbGljaywgdGhpcykpO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQo9C00LDQu9GP0LXRgiDRgdC+0LTQtdGA0LbQuNC80L7QtSDQvNCw0LrQtdGC0LAg0LjQtyBET00uXG4gICAqIEBzZWUgaHR0cHM6Ly9hcGkueWFuZGV4LnJ1L21hcHMvZG9jL2pzYXBpLzIuMS9yZWYvcmVmZXJlbmNlL2xheW91dC50ZW1wbGF0ZUJhc2VkLkJhc2UueG1sI2NsZWFyXG4gICAqIEBmdW5jdGlvblxuICAgKiBAbmFtZSBjbGVhclxuICAgKi9cbiAgY2xlYXI6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl8kZWxlbWVudC5maW5kKCcuY2xvc2UnKS5vZmYoJ2NsaWNrJyk7XG4gICAgdGhpcy5jb25zdHJ1Y3Rvci5zdXBlcmNsYXNzLmNsZWFyLmNhbGwodGhpcyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCc0LXRgtC+0LQg0LHRg9C00LXRgiDQstGL0LfQstCw0L0g0YHQuNGB0YLQtdC80L7QuSDRiNCw0LHQu9C+0L3QvtCyINCQ0J/QmCDQv9GA0Lgg0LjQt9C80LXQvdC10L3QuNC4INGA0LDQt9C80LXRgNC+0LIg0LLQu9C+0LbQtdC90L3QvtCz0L4g0LzQsNC60LXRgtCwLlxuICAgKiBAc2VlIGh0dHBzOi8vYXBpLnlhbmRleC5ydS9tYXBzL2RvYy9qc2FwaS8yLjEvcmVmL3JlZmVyZW5jZS9JQmFsbG9vbkxheW91dC54bWwjZXZlbnQtdXNlcmNsb3NlXG4gICAqIEBmdW5jdGlvblxuICAgKiBAbmFtZSBvblN1YmxheW91dFNpemVDaGFuZ2VcbiAgICovXG4gIG9uU3VibGF5b3V0U2l6ZUNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgIE15QmFsbG9vbkxheW91dC5zdXBlcmNsYXNzLm9uU3VibGF5b3V0U2l6ZUNoYW5nZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmKCF0aGlzLl9pc0VsZW1lbnQodGhpcy5fJGVsZW1lbnQpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5hcHBseUVsZW1lbnRPZmZzZXQoKTtcbiAgICB0aGlzLmV2ZW50cy5maXJlKCdzaGFwZWNoYW5nZScpO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQodC00LLQuNCz0LDQtdC8INCx0LDQu9GD0L0sINGH0YLQvtCx0YsgXCLRhdCy0L7RgdGC0LjQulwiINGD0LrQsNC30YvQstCw0Lsg0L3QsCDRgtC+0YfQutGDINC/0YDQuNCy0Y/Qt9C60LguXG4gICAqIEBzZWUgaHR0cHM6Ly9hcGkueWFuZGV4LnJ1L21hcHMvZG9jL2pzYXBpLzIuMS9yZWYvcmVmZXJlbmNlL0lCYWxsb29uTGF5b3V0LnhtbCNldmVudC11c2VyY2xvc2VcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBuYW1lIGFwcGx5RWxlbWVudE9mZnNldFxuICAgKi9cbiAgYXBwbHlFbGVtZW50T2Zmc2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fJGVsZW1lbnQuY3NzKHtcbiAgICAgIGxlZnQ6IC0odGhpcy5fJGVsZW1lbnRbMF0ub2Zmc2V0V2lkdGggLyAyKSxcbiAgICAgIHRvcDogLSh0aGlzLl8kZWxlbWVudFswXS5vZmZzZXRIZWlnaHQgKyB0aGlzLl8kZWxlbWVudC5maW5kKCcuYXJyb3cnKVswXS5vZmZzZXRIZWlnaHQpXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCX0LDQutGA0YvQstCw0LXRgiDQsdCw0LvRg9C9INC/0YDQuCDQutC70LjQutC1INC90LAg0LrRgNC10YHRgtC40LosINC60LjQtNCw0Y8g0YHQvtCx0YvRgtC40LUgXCJ1c2VyY2xvc2VcIiDQvdCwINC80LDQutC10YLQtS5cbiAgICogQHNlZSBodHRwczovL2FwaS55YW5kZXgucnUvbWFwcy9kb2MvanNhcGkvMi4xL3JlZi9yZWZlcmVuY2UvSUJhbGxvb25MYXlvdXQueG1sI2V2ZW50LXVzZXJjbG9zZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQG5hbWUgb25DbG9zZUNsaWNrXG4gICAqL1xuICBvbkNsb3NlQ2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHRoaXMuZXZlbnRzLmZpcmUoJ3VzZXJjbG9zZScpO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQmNGB0L/QvtC70YzQt9GD0LXRgtGB0Y8g0LTQu9GPINCw0LLRgtC+0L/QvtC30LjRhtC40L7QvdC40YDQvtCy0LDQvdC40Y8gKGJhbGxvb25BdXRvUGFuKS5cbiAgICogQHNlZSBodHRwczovL2FwaS55YW5kZXgucnUvbWFwcy9kb2MvanNhcGkvMi4xL3JlZi9yZWZlcmVuY2UvSUxheW91dC54bWwjZ2V0Q2xpZW50Qm91bmRzXG4gICAqIEBmdW5jdGlvblxuICAgKiBAbmFtZSBnZXRDbGllbnRCb3VuZHNcbiAgICogQHJldHVybnMge051bWJlcltdW119INCa0L7QvtGA0LTQuNC90LDRgtGLINC70LXQstC+0LPQviDQstC10YDRhdC90LXQs9C+INC4INC/0YDQsNCy0L7Qs9C+INC90LjQttC90LXQs9C+INGD0LPQu9C+0LIg0YjQsNCx0LvQvtC90LAg0L7RgtC90L7RgdC40YLQtdC70YzQvdC+INGC0L7Rh9C60Lgg0L/RgNC40LLRj9C30LrQuC5cbiAgICovXG4gIGdldFNoYXBlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYoIXRoaXMuX2lzRWxlbWVudCh0aGlzLl8kZWxlbWVudCkpIHtcbiAgICAgIHJldHVybiBNeUJhbGxvb25MYXlvdXQuc3VwZXJjbGFzcy5nZXRTaGFwZS5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIHZhciBwb3NpdGlvbiA9IHRoaXMuXyRlbGVtZW50LnBvc2l0aW9uKCk7XG5cbiAgICByZXR1cm4gbmV3IHltYXBzLnNoYXBlLlJlY3RhbmdsZShuZXcgeW1hcHMuZ2VvbWV0cnkucGl4ZWwuUmVjdGFuZ2xlKFtcbiAgICAgIFtwb3NpdGlvbi5sZWZ0LCBwb3NpdGlvbi50b3BdLCBbXG4gICAgICAgIHBvc2l0aW9uLmxlZnQgKyB0aGlzLl8kZWxlbWVudFswXS5vZmZzZXRXaWR0aCxcbiAgICAgICAgcG9zaXRpb24udG9wICsgdGhpcy5fJGVsZW1lbnRbMF0ub2Zmc2V0SGVpZ2h0ICsgdGhpcy5fJGVsZW1lbnQuZmluZCgnLmFycm93JylbMF0ub2Zmc2V0SGVpZ2h0XG4gICAgICBdXG4gICAgXSkpO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQn9GA0L7QstC10YDRj9C10Lwg0L3QsNC70LjRh9C40LUg0Y3Qu9C10LzQtdC90YLQsCAo0LIg0JjQlSDQuCDQntC/0LXRgNC1INC10LPQviDQtdGJ0LUg0LzQvtC20LXRgiDQvdC1INCx0YvRgtGMKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBuYW1lIF9pc0VsZW1lbnRcbiAgICogQHBhcmFtIHtqUXVlcnl9IFtlbGVtZW50XSDQrdC70LXQvNC10L3Rgi5cbiAgICogQHJldHVybnMge0Jvb2xlYW59INCk0LvQsNCzINC90LDQu9C40YfQuNGPLlxuICAgKi9cbiAgX2lzRWxlbWVudDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gZWxlbWVudCAmJiBlbGVtZW50WzBdICYmIGVsZW1lbnQuZmluZCgnLmFycm93JylbMF07XG4gIH1cbn0pO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG55bWFwcy5yZWFkeShmdW5jdGlvbigpIHtcbiAgdmFyIGJhbGxvb25MYXlvdXQgPSByZXF1aXJlKCcuL2JhbGxvb25fbGF5b3V0LmpzJyk7XG4gIHZhciBjb25maWcgPSByZXF1aXJlKCcuL3NldHRpbmdzLmpzJyk7XG4gIHZhciBzb2NrZXQgPSByZXF1aXJlKCcuL3NvY2tldC5qcycpO1xuXG4gIHZhciBjb25uO1xuXG4gIHZhciBtYXAgPSBuZXcgeW1hcHMuTWFwKCdtYXAnLCB7XG4gICAgLy8gW2xhdGl0dWRlLCBsb25naXR1ZGVdXG4gICAgY2VudGVyOiBbNDYuMjMsIDMwLjQ3XSxcbiAgICB6b29tOiAxMFxuICB9KTtcblxuICB2YXIgb2JqZWN0TWFuYWdlciA9IG5ldyB5bWFwcy5PYmplY3RNYW5hZ2VyKHtcbiAgICBjbHVzdGVyaXplOiB0cnVlLFxuICAgIGdyaWRTaXplOiAzMlxuICB9KTtcblxuICBjb25maWcuc2V0T3B0aW9uc09iamVjdE1hbmFnZXIob2JqZWN0TWFuYWdlciwgYmFsbG9vbkxheW91dC5MYXlvdXQsIGJhbGxvb25MYXlvdXQuQ29udGVudExheW91dCk7XG4gIG1hcC5nZW9PYmplY3RzLmFkZChvYmplY3RNYW5hZ2VyKTtcblxuICAkLmFqYXgoe1xuICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgdXJsOiAnL3BvaW50cycsXG4gICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiXG4gIH0pLmRvbmUoZnVuY3Rpb24oZGF0YSkge1xuICAgIG9iamVjdE1hbmFnZXIuYWRkKGRhdGEpO1xuICB9KTtcblxuICBtYXAuZXZlbnRzLmFkZCgnY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgdmFyIGNvb3JkcyA9IGUuZ2V0KCdjb29yZHMnKTtcblxuICAgICQuYWpheCh7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIHVybDogJy9wb2ludHMnLFxuICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiLFxuICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoeyBcImxvY1wiOiBjb29yZHMucmV2ZXJzZSgpIH0pXG4gICAgfSkuZG9uZShmdW5jdGlvbihkYXRhKSB7XG4gICAgICBvYmplY3RNYW5hZ2VyLmFkZChkYXRhKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgb2JqZWN0TWFuYWdlci5vYmplY3RzLmV2ZW50cy5hZGQoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgb2JqZWN0SWQgPSBlLmdldCgnb2JqZWN0SWQnKTtcbiAgICB2YXIgb2JqZWN0ID0gb2JqZWN0TWFuYWdlci5vYmplY3RzLmdldEJ5SWQob2JqZWN0SWQpO1xuICAgIHZhciBjb29yZHMgPSBvYmplY3QuZ2VvbWV0cnkuY29vcmRpbmF0ZXMucmV2ZXJzZSgpO1xuXG4gICAgJC5hamF4KHtcbiAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICB1cmw6ICcvcG9pbnRzJyxcbiAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIixcbiAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KHsgXCJpZFwiOiBvYmplY3QuaWQsIFwibG9jXCI6IGNvb3JkcyB9KVxuICAgIH0pLmRvbmUoZnVuY3Rpb24oZGF0YSkge1xuICAgICAgb2JqZWN0TWFuYWdlci5yZW1vdmUob2JqZWN0KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgaWYgKHdpbmRvd1tcIldlYlNvY2tldFwiXSkge1xuICAgIGNvbm4gPSBuZXcgV2ViU29ja2V0KFwid3M6Ly9cIiArIGNvbmZpZy5nZXRDdXJyZW50VXJsKCkgKyBcIi9odWJcIik7XG5cbiAgICBjb25uLm9ub3BlbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHNvY2tldC5jcmVhdGVOb3RpZnkoXG4gICAgICAgIFwiPHN0cm9uZz5XZWxjb21lITwvc3Ryb25nPlwiLFxuICAgICAgICBcIlNvY2tldCBjb25uZWN0aW9uIHRvIHNlcnZlciB3YXMgc3VjY2Vzc2Z1bGx5IGVzdGFibGlzaGVkIVwiLFxuICAgICAgICBcImluZm9cIlxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25uLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciBtZXNzYWdlID0gSlNPTi5wYXJzZShlLmRhdGEpO1xuXG4gICAgICBzd2l0Y2ggKG1lc3NhZ2UuYWN0aW9uKSB7XG4gICAgICAgIGNhc2UgXCJwb2ludF9hZGRcIjpcbiAgICAgICAgICBzb2NrZXQuUG9pbnRBZGQob2JqZWN0TWFuYWdlciwgbWVzc2FnZS5tZXNzYWdlKVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwicG9pbnRfcmVtb3ZlXCI6XG4gICAgICAgICAgc29ja2V0LlBvaW50UmVtb3ZlKG9iamVjdE1hbmFnZXIsIG1lc3NhZ2UubWVzc2FnZSlcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25uLm9uY2xvc2UgPSBmdW5jdGlvbihlKSB7XG4gICAgICBzb2NrZXQuY3JlYXRlTm90aWZ5KFxuICAgICAgICBcIjxzdHJvbmc+U29tZXRoaW5nIGhhcHBlbmVkITwvc3Ryb25nPlwiLFxuICAgICAgICBcIlNvY2tldCBjb25uZWN0aW9uIHdhcyBjbG9zZWQhXCIsXG4gICAgICAgIFwiZGFuZ2VyXCJcbiAgICAgICk7XG4gICAgfVxuXG4gIH1cblxufSk7XG4iLCJtb2R1bGUuZXhwb3J0cy5zZXRPcHRpb25zT2JqZWN0TWFuYWdlciA9IGZ1bmN0aW9uKG9iamVjdE1hbmFnZXIsIGJhbGxvb25MYXlvdXQsIGJhbGxvb25Db250ZW50TGF5b3V0KSB7XG4gIG9iamVjdE1hbmFnZXIub2JqZWN0cy5vcHRpb25zLnNldCgnYmFsbG9vbk9mZnNldCcsIFsyLCAtNTBdKTtcbiAgb2JqZWN0TWFuYWdlci5vYmplY3RzLm9wdGlvbnMuc2V0KCdiYWxsb29uU2hhZG93JywgZmFsc2UpO1xuICBvYmplY3RNYW5hZ2VyLm9iamVjdHMub3B0aW9ucy5zZXQoJ2JhbGxvb25MYXlvdXQnLCBiYWxsb29uTGF5b3V0KTtcbiAgb2JqZWN0TWFuYWdlci5vYmplY3RzLm9wdGlvbnMuc2V0KCdiYWxsb29uQ29udGVudExheW91dCcsIGJhbGxvb25Db250ZW50TGF5b3V0KTtcbiAgb2JqZWN0TWFuYWdlci5vYmplY3RzLm9wdGlvbnMuc2V0KCdiYWxsb29uUGFuZWxNYXhNYXBBcmVhJywgMCk7XG4gIG9iamVjdE1hbmFnZXIub2JqZWN0cy5vcHRpb25zLnNldCgncHJlc2V0JywgJ2lzbGFuZHMjZ3JlZW5Eb3RJY29uJyk7XG4gIG9iamVjdE1hbmFnZXIuY2x1c3RlcnMub3B0aW9ucy5zZXQoJ3ByZXNldCcsICdpc2xhbmRzI2dyZWVuQ2x1c3Rlckljb25zJyk7XG59XG5cbm1vZHVsZS5leHBvcnRzLmdldEN1cnJlbnRVcmwgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGRvY1VybCA9IGRvY3VtZW50LlVSTDtcbiAgdmFyIHVybDtcblxuICBpZiAoZG9jVXJsLmluZGV4T2YoJ2h0dHA6Ly8nKSA+IC0xKSB7XG4gICAgdXJsID0gZG9jVXJsLnN1YnN0cmluZyg3LCBkb2NVcmwubGVuZ3RoIC0gMSk7XG4gIH0gZWxzZSBpZiAoZG9jVXJsLmluZGV4T2YoJ2h0dHBzOi8vJykgPiAtMSkge1xuICAgIHVybCA9IGRvY1VybC5zdWJzdHJpbmcoOCwgZG9jVXJsLmxlbmd0aCAtIDEpO1xuICB9IGVsc2Uge1xuICAgIHVybCA9IGRvY1VybDtcbiAgfVxuXG4gIHJldHVybiB1cmw7XG59XG4iLCJ2YXIgY3JlYXRlTm90aWZ5ID0gZnVuY3Rpb24odGl0bGUsIHRleHQsIHR5cGUpIHtcbiAgJC5ub3RpZnkoe1xuICAgIHRpdGxlOiB0aXRsZSArIFwiIFwiLFxuICAgIG1lc3NhZ2U6IHRleHRcbiAgfSwge1xuICAgIG9mZnNldDoge1xuICAgICAgeDogMTAsXG4gICAgICB5OiAxMDBcbiAgICB9LFxuICAgIG5ld2VzdF9vbl90b3A6IHRydWUsXG4gICAgdHlwZTogdHlwZVxuICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlTm90aWZ5ID0gY3JlYXRlTm90aWZ5O1xuXG5tb2R1bGUuZXhwb3J0cy5Qb2ludEFkZCA9IGZ1bmN0aW9uKG9iamVjdE1hbmFnZXIsIG1lc3NhZ2UpIHtcbiAgb2JqZWN0TWFuYWdlci5hZGQobWVzc2FnZSk7XG4gIGNyZWF0ZU5vdGlmeShcbiAgICBcIk5ldyBwb2ludCB3YXMgY3JlYXRlZCFcIixcbiAgICBcIkZpbmQgaXQgb24gdGhlIG1hcCFcIixcbiAgICBcInN1Y2Nlc3NcIlxuICApO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5Qb2ludFJlbW92ZSA9IGZ1bmN0aW9uKG9iamVjdE1hbmFnZXIsIG1lc3NhZ2UpIHtcbiAgdmFyIG9iaiA9IG9iamVjdE1hbmFnZXIub2JqZWN0cy5nZXRCeUlkKG1lc3NhZ2UuaWQpO1xuICBpZiAob2JqKSB7IG9iamVjdE1hbmFnZXIucmVtb3ZlKG9iaik7IH1cblxuICBjcmVhdGVOb3RpZnkoXG4gICAgXCJQb2ludCB3YXMgZGVsZXRlZCFcIixcbiAgICBcIlNvbWVib2R5IGNsZWFudXBzIHRoZSBtYXAuLi5cIixcbiAgICBcIndhcm5pbmdcIlxuICApO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5iYWxsb29uTWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2UsIGF1dGhvciwgY3JlYXRlZEF0KSB7XG4gIHJldHVybiAgJzxsaSBjbGFzcz1cInJpZ2h0IGNsZWFyZml4XCI+JyArXG4gICAgICAgICAgICAnPGRpdiBjbGFzcz1cImNoYXQtYm9keSBjbGVhcmZpeFwiPicgK1xuICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JyArXG4gICAgICAgICAgICAgICAgICAgICc8c21hbGwgY2xhc3M9XCIgdGV4dC1tdXRlZFwiPjxzcGFuIGNsYXNzPVwiZ2x5cGhpY29uIGdseXBoaWNvbi10aW1lXCI+PC9zcGFuPicgKyBjcmVhdGVkQXQgKyAnPC9zbWFsbD4nICtcbiAgICAgICAgICAgICAgICAgICAgJzxzdHJvbmcgY2xhc3M9XCJwdWxsLXJpZ2h0IHByaW1hcnktZm9udFwiPicgKyBhdXRob3IgKyAnPC9zdHJvbmc+JyArXG4gICAgICAgICAgICAgICAgJzwvZGl2PicgK1xuICAgICAgICAgICAgICAgICc8cD4nICtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSArXG4gICAgICAgICAgICAgICAgJzwvcD4nICtcbiAgICAgICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgJzwvbGk+J1xufVxuIl19
