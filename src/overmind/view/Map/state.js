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
	dragging: false,
	geohashesToDraw: {},
	geohashesOnScreen: {},
	isLoading: false,
	cropLayers: {},
  layers: {},
	center: [40.9610401,-86.2031383],
	moving: false,
  zoom: 13,
  bounds: [
	  [40.9510401,-86.2131383],
	  [40.9810401,-86.1931383],
    /*
      41.44053877385792,
      -84.97886180877687
    ],
    [
      41.46330393671208,
      -84.96770381927492
    ]
    */
  ],
  notePolygons: (local, state) => {
    let results = _.filter(Object.values(state.notes.notes), 
      x => x.geometry.geojson.coordinates[0].length > 0)

    //flow
   //   (mapValues(state.notes.notes))
    //  (filter(x => x.geometry.geojson.coordinates[0].length > 0))
  }
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
