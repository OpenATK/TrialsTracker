import _ from "lodash";

export default {
	geohashPolygons: [],
	dragging_marker: false,
	geohashesToDraw: {},
	geohashesOnScreen: {},
	isLoading: false,
	crop_layers: {},
	center: [40.98551896940516, -86.18823766708374],
	moving: false,
  zoom: 13,
  bounds: [
    [
      41.44053877385792,
      -84.97886180877687
    ],
    [
      41.46330393671208,
      -84.96770381927492
    ]
  ],
  notePolygons: (local, state) => 
    _.chain(state.notes)
    .filter(note => 
			note.geometry.geojson.coordinates[0].length > 0
		)
  ,
  fields: (local, state) => {
    const fieldStyles = _.get(state, `view.Map.fieldStyles`)
    const editingField = _.get(state, `view.Map.editingField`)
    const operation = _.get(state, `view.TopBar.OperationDropdown.selectedOperation`)
    const fieldsToRender = _.get(state, `app.seasonFields`);
    return _.chain(fieldsToRender).mapValues((field, id) => {
      if (field === null) return null;
      if (field.boundary === null) return null;
      if (editingField === id) return null; //Don't show this field.
      var styledField = _.clone(field);
      //Add any styles
      if (fieldStyles[id] != null) styledField.style = fieldStyles[id];
      //Fill based on status of current operation
      if (operation) {
        var color = "white"
        if (operation.fields && operation.fields[id]) {
          if (operation.fields[id].status === 'planned') color = 'red'
          if (operation.fields[id].status === 'started') color = 'orange'
          if (operation.fields[id].status === 'done') color = '#0acd00' //Green
        }
        styledField.style = _.merge({}, styledField.style, {fillColor: color, color})
      }
      return styledField;
    }).omitBy((v, k) => {
      if (v === null) return true;
    }).value();
  },
  LayerControl: {
    cropLayers: {},
    yieldDataIndex: {},
    geohashPolygons: [],
    toggleCropLayer: {},
  },
  legends: {},
}
