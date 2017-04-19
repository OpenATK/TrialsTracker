import { 
  handleCurrentLocationButton,
  handleLocationFound,
  handleMapClick,
  handleDoneDrawing,
  undoDrawPoint,
  endMarkerDrag,
  startMarkerDrag,
  markerDragging,
  doneMovingMap,
  handleMapMoved,
  startMovingMap,
} from './chains';

export default {
  
  signals: {

    currentLocationButtonClicked: handleCurrentLocationButton,

    locationFound: handleLocationFound,

    mapMoved: [
      ...handleMapMoved, ...doneMovingMap,
    ],

    mapMoveStarted: startMovingMap,    

    markerDragEnded: endMarkerDrag,

    markerDragged: markerDragging,

    mouseDownOnMap: handleMapClick,

    undoButtonClicked: undoDrawPoint,
  }
}
