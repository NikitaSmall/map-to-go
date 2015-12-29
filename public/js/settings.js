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
