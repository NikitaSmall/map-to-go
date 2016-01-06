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
