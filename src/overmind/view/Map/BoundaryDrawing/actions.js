import _ from 'lodash';
import {pipe, debounce, mutate} from 'overmind';
import uuid from 'uuid/v1';

export default {
  addPointToBoundary({state}, props) {
    const myState = state.view.Map.BoundaryDrawing;
    _.set(myState, `boundary.${uuid()}`, [props.lat, props.lng]);
  },
  updateBoundaryPoint: pipe(debounce(10), mutate(({state}, props) => {
    const myState = state.view.Map.BoundaryDrawing;
    _.set(myState, `boundary.${props.id}`, [props.latlng.lat, props.latlng.lng]);
  })),
  onMapClick({state, actions}, {lat, lng}) {
    const myState = state.view.Map.BoundaryDrawing;
    const myActions = actions.view.Map.BoundaryDrawing;
    if (myState.drawing) {
      myActions.addPointToBoundary({lat, lng});
    }
  },
  onMarkerMove({actions}, props) {
    const myActions = actions.view.Map.BoundaryDrawing;
    myActions.updateBoundaryPoint(props);
  },
  onStartDrawing({state}, props) {
    const myState = state.view.Map.BoundaryDrawing;
    myState.boundary = (props || {}).boundary || {};
    myState.drawing = true;
  },
  onStopDrawing({state}, props) {
    const myState = state.view.Map.BoundaryDrawing;
    myState.drawing = false;
    myState.boundary = {};
  }
}
