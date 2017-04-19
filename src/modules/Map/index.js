import { 
  handleCurrentLocationButton,
  handleLocationFound,
  handleMapClick,
  undoDrawPoint,
  endMarkerDrag,
  startMarkerDrag,
  markerDragging,
  doneMovingMap,
  handleMapMoved,
  startMovingMap,
  handleFieldNoteClick,
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

    undoButtonClicked: undoDrawPoint,
  }
}
