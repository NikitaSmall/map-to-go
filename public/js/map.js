ymaps.ready(function() {
  var map = new ymaps.Map('map', {
    center: [46.23, 30.47],
    zoom: 10
  });

  var objectManager = new ymaps.ObjectManager({
    clusterize: true,
    gridSize: 32
  });

  objectManager.objects.options.set('preset', 'islands#greenDotIcon');
  objectManager.clusters.options.set('preset', 'islands#greenClusterIcons');
  map.geoObjects.add(objectManager);

  map.events.add('click', function(e) {
    var coords = e.get('coords');
    console.log(coords);

    $.ajax({
      method: 'POST',
      url: '/point',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({ "loc": coords.reverse() })
    }).done(function(data) {
      console.log(data);
      // objectManager.add(data);
    });

    var mapObject = {
      "type": "Feature",
      "id": Math.floor((Math.random() * 1000) + 1),
      "geometry": {
        "type": "Point",
        "coordinates": coords
      }
    };

  });
});
