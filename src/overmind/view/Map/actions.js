import {debounce, mutate, pipe} from 'overmind'
import md5 from 'md5';
import gjArea from '@mapbox/geojson-area';
import _ from 'lodash'
import Promise from 'bluebird'
import BBox from '@turf/bbox'
import GeoJSON from 'geojson'

export default {
  async zoomTo({state}, {latitude, longitude, zoom}) {
    const myState = _.get(state, 'view.Map');
    myState.center = [latitude, longitude];
    myState.zoom = zoom;
    await Promise.delay(500);
    myState.center = null;
    myState.zoom = null;
  },
  styleField: {
    highlight({state}, fieldId) {
      if (fieldId) {
        const myState = _.get(state, 'view.Map');
        _.set(myState, `fieldStyles.${fieldId}`, {weight: 5})
      }
    },
    unhighlight({state}, fieldId) {
      if (fieldId) {
        const myState = _.get(state, 'view.Map');
        _.set(myState, `fieldStyles.${fieldId}`, {weight: 3})
      }
    }
  },
  async unselectField({state, actions}) {
    const myActions = _.get(actions, 'view.Map');
    const myState = _.get(state, 'view.Map');
    if (myState.selectedField) {
      actions.view.FieldDetails.close();
      myActions.styleField.unhighlight(myState.selectedField);
      await Promise.delay(200)
      myState.selectedField = null;
    }
  },
  onFieldClick({state, actions}, {id}) {
    const myActions = _.get(actions, 'view.Map');
    const myState = _.get(state, 'view.Map');
    const drawing = _.get(myState, `BoundaryDrawing.drawing`);
    if (!drawing) {
      myActions.styleField.unhighlight(myState.selectedField);
      myState.selectedField = id;
      myActions.styleField.highlight(id);
      actions.view.FieldDetails.open();
    }
  },
  async zoomBounds({state}, props) {
    const myState = _.get(state, 'view.Map');
    const fields = _.compact(_.map(myState.fields, (f) => {
      if (!f.boundary) return null; //Don't include fields without boundaries
      return {geo: f.boundary}
    }));
    const featureCollection = GeoJSON.parse(fields, {GeoJSON: 'geo'})
    const bounds = BBox(featureCollection)
    if (isFinite(bounds[0]) && isFinite(bounds[1]) && isFinite(bounds[2]) && isFinite(bounds[3])) {
      myState.bounds = [[bounds[1], bounds[0]], [bounds[3], bounds[2]]];
    }
  },
  mapMoveStarted({state}) {
    state.view.Map.moving = true;
  },
  toggleCropLayerVisibility({actions}, props) {
    actions.view.Map.toggleCropLayer(props);
  },
  handleLocationFound({actions}, props) {
    actions.view.Map.setCurrentLocation(props);
  },
  handleFieldNoteClick({actions}, props) {
    actions.view.Map.mapToFieldPolygon(props);
  },
  onMapClick({state, actions}, props) {
    actions.notes.onMapClick(props);
  },
  undoDrawPoint({actions, state}, props) {
    actions.view.Map.undo(props);
    actions.notes.recalculateNoteArea();
    actions.notes.getNoteBoundingBox();
  },
  markerDragEnded({state}) {
    state.view.Map.dragging = false;
  },
  markerDragStarted({state}) {
    state.view.Map.dragging = true;
  },
  setMarkerPosition({state}, {latlng, i}) {
    state.notes.notes[state.notes.selectedNote].boundary.geojson.coordinates[0][i] = [latlng.lng, latlng.lat];
  },
  markerDragged({actions, state}, {noteType, latlng, id, idx}) {
    state.notes[noteType][id].boundary.geojson.coordinates[0][idx] = [latlng.lng, latlng.lat];
    let boundary = actions.view.Map.updateGeometry({noteType,id});
    state.notes[noteType][id].boundary = boundary;
  },
  markerDragged({actions, state}, props) {
    actions.view.Map.setMarkerPosition(props); 
    actions.notes.recalculateNoteArea();
  },
  handleCurrentLocationButton({state, actions}) {
    actions.view.Map.setMapToCurrentLocation()
  },
  mapMoved({state, actions}, props) {
    actions.view.Map.setMapLocation(props);
    state.view.Map.moving = false;
  },
  setMapLocation({state}, {center, zoom}) {
    state.view.Map.center = [center[0], center[1]];
    state.view.Map.zoom = zoom;
  },
  setMapToCurrentLocation({state}) {
    let loc = state.get('App.model.current_location');
    if (loc) state.set('view.Map.center', [loc.lat, loc.lng]);
  },
  recalculateArea({state}, boundary) {
    if (boundary && boundary.coordinates[0].length > 2) {
      return gjArea.boundary(boundary)/4046.86;
    } else return 0.0
  },
  computeBoundingBox({}, geojsonPolygon) {
    let bbox;
    let coords = geojsonPolygon.coordinates[0];
    let north = coords[0][1];
    let south = coords[0][1];
    let east = coords[0][0];
    let west = coords[0][0];
    for (let j = 0; j < coords.length; j++) {
      if (coords[j][1] > north) north = coords[j][1];
      if (coords[j][1] < south) south = coords[j][1];
      if (coords[j][0] > east) east = coords[j][0];
      if (coords[j][0] < west) west = coords[j][0];
    }
    bbox = {north, south, east, west};

    return bbox;
  },
  getGeometryABCs({state, actions}, geojson) {
    if (geojson) {
      let area = geojson.coordinates[0].length > 2 ? gjArea.geometry(geojson)/4046.86 : 0.0;
      let bbox = actions.view.Map.computeBoundingBox(geojson);
      let centroid = [(bbox.north + bbox.south)/2, (bbox.east + bbox.west)/2];
      return {area, bbox, centroid}
    }
  },
}

function setCurrentLocation({props, state}) {
  let obj = {
    lat: props.lat,
    lng: props.lng,
  }
  state.set('App.model.current_location', obj);
}



function undo({props, state}) {
  let id = state.get('notes.selectedNote');
	let points = state.get(`notes.notes.${id}.boundary.geojson.coordinates.0`);
  if (points.length > 0) {
    state.pop(`notes.notes.${id}.boundary.geojson.coordinates.0`);
  }
}

function mapToFieldPolygon({props, state}) {
  var field = state.get(`Fields.${props.id}`);
  if (field) state.set('view.Map.center', field.boundary.centroid);
}

function toggleCropLayer({props, state}) {
  var vis = state.get(`view.Map.crop_layers.${props.crop}.visible`);
  state.set(`view.Map.crop_layers${props.crop}.visible`, !vis);
}


