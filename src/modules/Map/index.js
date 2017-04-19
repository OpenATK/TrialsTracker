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
} from './chains';

export default {
  
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
}
