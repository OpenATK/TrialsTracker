import stateTree from './stateTree.js';

import { selectNote } from './chains';
import { updateNoteText } from './chains';
import { updateTagText } from './chains';
import { changeSortMode } from './chains';
import { changeShowHideState } from './chains';
import { addNewNote } from './chains';
import { removeNote } from './chains';
import { getYieldData } from './chains';
import { initialize } from './chains';
import { handleNoteClick } from './chains';
import { addGeohashes } from './chains';
import { removeGeohashes } from './chains';
import { addTag } from './chains';
import { handleNoteListClick } from './chains';
import { enterNoteEditMode } from './chains';
import { exitNoteEditMode } from './chains';
import { removeTag } from './chains';
import { clearCache } from './chains';
import { updateDomainText } from './chains';
import { submitDomainModal } from './chains';
import { cancelDomainModal } from './chains';
import { displayDomainModal } from './chains';
import { toggleCropLayerVisibility } from './chains';
import { toggleCropDropdownVisibility } from './chains';
import { handleLocationFound } from './chains';
import { handleCurrentLocationButton } from './chains';
import { handleMapMoved } from './chains';
import { setFieldBoundarySource } from './chains';

import { drawComplete } from './map-chains';
import { handleMouseDown } from './map-chains';
import { handleDoneDrawing } from './map-chains';
import { undoDrawPoint } from './map-chains';
import { calculatePolygonArea } from './map-chains';
import { endMarkerDrag } from './map-chains';
import { startMarkerDrag } from './map-chains';
import { markerDragging } from './map-chains';
import { doneMovingMap } from './map-chains';
import { startMovingMap } from './map-chains';

export default (module) => {
  module.addState(
    stateTree
  )

  module.addSignals({

    init: [
      ...initialize
    ],

    mapMoved: [
      ...handleMapMoved, ...doneMovingMap,
    ],

    toggleCropLayer: [
      ...toggleCropLayerVisibility,
    ],

    cropDropdownClicked: [
      ...toggleCropDropdownVisibility,
    ],

    markerDragStarted: [
      ...startMarkerDrag,
    ],

    markerDragged: [
      ...markerDragging,
    ],

    markerDragEnded: [
      ...endMarkerDrag,
    ],

    fieldBoundarySourceButtonClicked: [
      ...setFieldBoundarySource,
    ],

    domainSubmitClicked: [
      ...submitDomainModal,
    ],

    domainCancelClicked: [
      ...cancelDomainModal,
    ],

    domainTextChanged: {
      chain: [...updateDomainText],
      immediate: true,
    },

    clearCacheButtonClicked: [
      ...clearCache,
    ],

    tileUnloaded: [
      ...removeGeohashes,
    ],

    newTileDrawn: [
      ...addGeohashes,
    ],

    mapDoubleClicked: [
      ...handleMouseDown, drawComplete,
    ],

    doneDrawingButtonClicked: [
      ...drawComplete, ...exitNoteEditMode
    ],
  
    sortingTabClicked: [
      ...changeSortMode
    ],

    noteClicked: [
      ...handleNoteClick
    ], 

    deleteNoteButtonClicked: [
      ...removeNote
    ],

    editNoteButtonClicked: [
      ...enterNoteEditMode,
    ],

    noteTextChanged: {
      chain: [...updateNoteText],
      immediate: true,
    },

    tagInputTextChanged: {
      chain: [...updateTagText],
      immediate: true,
    },

    mouseDownOnMap: [
      ...handleMouseDown, ...calculatePolygonArea,
    ],

    showHideButtonClicked: [
      ...changeShowHideState
    ],

    addNoteButtonClicked: [
      ...addNewNote,
    ],

    tagRemoved: [
      ...removeTag,
    ],

    tagAdded: [
      ...addTag, 
    ],

    noteListClicked: [
      ...handleNoteListClick,
    ],

    setDomainButtonClicked: [
      ...displayDomainModal,
    ],

    undoButtonClicked: [
      ...undoDrawPoint,
    ],

    locationFound: [
      ...handleLocationFound,
    ],

    currentLocationButtonClicked: [
      ...handleCurrentLocationButton,
    ],
 
    mapMoveStarted: [
      ...startMovingMap,    
    ]

  })
}
