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

  var MyBalloonContentLayout = ymaps.templateLayoutFactory.createClass(
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

  var MyBalloonLayout = ymaps.templateLayoutFactory.createClass(
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

  setOptionsObjectManager(objectManager, MyBalloonLayout, MyBalloonContentLayout);
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

    conn.onclose = function(e) {
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
    newest_on_top: true,
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

var setOptionsObjectManager = function(objectManager, balloonLayout, balloonContentLayout) {
  objectManager.objects.options.set('balloonOffset', [2, -50]);
  objectManager.objects.options.set('balloonShadow', false);
  objectManager.objects.options.set('balloonLayout', balloonLayout);
  objectManager.objects.options.set('balloonContentLayout', balloonContentLayout);
  objectManager.objects.options.set('balloonPanelMaxMapArea', 0);
  objectManager.objects.options.set('preset', 'islands#greenDotIcon');
  objectManager.clusters.options.set('preset', 'islands#greenClusterIcons');
}

var balloonMessage = function(message, author, createdAt) {
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
