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

module.exports.PointAdd = function(map, objectManager, searchObjectManager, searchCircle, message) {
  objectManager.add(message);

  if ((map.geoObjects.indexOf(searchCircle) != -1) && searchCircle.geometry.contains(message.geometry.coordinates)) {
    searchObjectManager.add(message);
  }
  createNotify(
    "New point was created!",
    "Find it on the map!",
    "success"
  );
}

module.exports.PointRemove = function(map, objectManager, searchObjectManager, searchCircle, message) {
  var obj = objectManager.objects.getById(message.id);
  if (obj) { objectManager.remove(obj); }
  if ((map.geoObjects.indexOf(searchCircle) != -1) && searchCircle.geometry.contains(obj.geometry.coordinates)) {
    searchObjectManager.remove(obj);
  }

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
