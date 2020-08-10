import _ from 'lodash';
import Promise from 'bluebird';
import BBox from '@turf/bbox';
import GeoJSON from 'geojson';

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
  onMapClick({actions}, props) {
    const myActions = _.get(actions, 'view.Map');
    myActions.unselectField()
    //Pass click to boundary drawing
    myActions.BoundaryDrawing.onMapClick(props)
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
  }
}
