import filter from "lodash/fp/filter";
import values from "lodash/fp/values";
import mapValues from "lodash/fp/mapValues";
import compose from "lodash/fp/compose";
import flow from "lodash/fp/flow";
import _ from "lodash";
import get from "lodash/fp/get";
import path from "lodash/fp/path";

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
    flow
      (mapValues(state.notes))
      (filter(x => x.geometry.geojson.coordinates[0].length > 0))
  ,
  fields: (local, state) => {
    const fieldStyles = get(state)(`view.Map.fieldStyles`)
    const editingField = path(state)(`view.Map.editingField`)
    const operation = path(state)(`view.TopBar.OperationDropdown.selectedOperation`)
    const fieldsToRender = path(state)(`app.seasonFields`);
  },
  LayerControl: {
    cropLayers: {},
    yieldDataIndex: {},
    geohashPolygons: [],
    toggleCropLayer: {},
  },
  legends: {},
}
