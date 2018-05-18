import { Module } from 'cerebral'
import { 
  endMarkerDrag,
  doneMovingMap,
  handleCurrentLocationButton,
  handleFieldNoteClick,
  handleLocationFound,
	handleMapClick,
  handleMapMoved,
  markerDragging,
  startMarkerDrag,
  startMovingMap,
  toggleCropLayerVisibility,
  undoDrawPoint,
} from './sequences';

export default Module({

	state: {
		//center: [40.739618459,-79.685532363],
		center: [40.98551896940516, -86.18823766708374],
		moving: false,
		geohashPolygons: [],
		zoom: 15,
		isLoading: false,
		dragging_marker: false,
		crop_layers: {},
		geohashesToDraw: {},
		geohashesOnScreen: {}
	},
  
  signals: {
    currentLocationButtonClicked: handleCurrentLocationButton,
    fieldNoteClicked: handleFieldNoteClick,
    locationFound: handleLocationFound,
    mapMoved: [
      ...handleMapMoved, ...doneMovingMap,
    ],
    mapMoveStarted: startMovingMap,    
    markerDragEnded: endMarkerDrag,
    markerDragStarted: startMarkerDrag,
    markerDragged: markerDragging,
    mouseDownOnMap: handleMapClick,
    toggleCropLayer: toggleCropLayerVisibility,
    undoButtonClicked: undoDrawPoint,
  }
})
