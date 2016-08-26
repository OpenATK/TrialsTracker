/*
 * Control.AddPolygon is used for the default zoom buttons on the map.
 */
var L = require('leaflet');

L.Control.AddPolygon = L.Control.extend({
  options: {
    position: 'topleft',
    buttonText: 'Add',
  },

  onAdd: function (map) {
    var addPolygonName = 'leaflet-control-add-polygon',
    container = L.DomUtil.create('div', addPolygonName + ' leaflet-bar');

    this._map = map;

    this._Button = this._createButton(
      this.options.buttonText, addPolygonName, container, 
      this._addPolygon, this);
		
    this._updateDisabled();
    return container;
  },

  onRemove: function (map) {
  },

  _addPolygon: function (e) {
    this._map.zoomOut(e.shiftKey ? 3 : 1);
  },

  _createButton: function (html, className, container, fn, context) {
    var link = L.DomUtil.create('a', className, container);
    link.innerHTML = html;
    link.href = '#';
    link.title = title;

    var stop = L.DomEvent.stopPropagation;

    L.DomEvent
     .on(link, 'click', stop)
     .on(link, 'mousedown', stop)
     .on(link, 'dblclick', stop)
     .on(link, 'click', L.DomEvent.preventDefault)
     .on(link, 'click', fn, context)
     .on(link, 'click', this._refocusOnMap, context);

    return link;
  },

  _updateDisabled: function () {
    var map = this._map,
      className = 'leaflet-disabled';

    L.DomUtil.removeClass(this._zoomInButton, className);
    L.DomUtil.removeClass(this._zoomOutButton, className);

    if (map._zoom === map.getMinZoom()) {
      L.DomUtil.addClass(this._zoomOutButton, className);
    }
    if (map._zoom === map.getMaxZoom()) {
      L.DomUtil.addClass(this._zoomInButton, className);
    }
  }
});

L.Map.mergeOptions({
});

L.Map.addInitHook(function () {
	if (this.options.zoomControl) {
		this.zoomControl = new L.Control.Zoom();
		this.addControl(this.zoomControl);
	}
});

L.control.zoom = function (options) {
	return new L.Control.Zoom(options);
};

