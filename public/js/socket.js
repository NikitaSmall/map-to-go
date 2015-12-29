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
