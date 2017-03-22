import stateTree from './stateTree.js';

import { 
  selectNote,
  updateNoteText,
  updateTagText,
  changeSortMode,
  changeShowHideState,
  addNewNote,
  removeNote,
  handleNoteClick,
  addTag,
  handleNoteListClick,
  enterNoteEditMode,
  exitNoteEditMode,
  removeTag,
  toggleNoteDropdown,
 } from '../Note/chains';

import { 
  addGeohashes,
  getYieldData,
  initialize,
  removeGeohashes,
  clearCache,
  updateOadaYieldDomain,
  updateOadaFieldsDomain,
  submitDataSourceSettings,
  cancelDataSourceSettings,
  displayDataSourceSettings,
  toggleCropLayerVisibility,
  toggleCropDropdownVisibility,
  handleLocationFound,
  handleCurrentLocationButton,
  handleMapMoved,
  setFieldsSource,
  setYieldSource,
} from './chains';

import { 
  drawComplete,
  handleMapClick,
  handleDoneDrawing,
  undoDrawPoint,
  endMarkerDrag,
  startMarkerDrag,
  markerDragging,
  doneMovingMap,
  startMovingMap,
} from '../Map/chains';

import { 
  toggleMenuDropdown,
  downloadNotes,
  toggleMapLegend,
} from '../MenuBar/chains';

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

    yieldSourceButtonClicked: [
      ...setYieldSource,
    ],

    fieldsSourceButtonClicked: [
      ...setFieldsSource,
    ],

    dataSourcesSubmitClicked: [
      ...submitDataSourceSettings,
    ],

    dataSourcesCancelClicked: [
      ...cancelDataSourceSettings,
    ],

    yieldOadaDomainChanged: {
      chain: [...updateOadaYieldDomain],
      immediate: true,
    },

    fieldsOadaDomainChanged: {
      chain: [...updateOadaFieldsDomain],
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
      ...enterNoteEditMode, ...toggleNoteDropdown,
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
      ...handleMapClick,
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

    dataSourcesButtonClicked: [
      ...displayDataSourceSettings,
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
    ],

    noteBackgroundClicked: [
      ...toggleNoteDropdown,
    ],
    
    menuBackgroundClicked: [
      ...toggleMenuDropdown,
    ],

    showNoteDropdown: [
      ...toggleNoteDropdown,
    ],

    showMenuDropdown: [
      ...toggleMenuDropdown,
    ],

    downloadNotesButtonClicked: [
      ...downloadNotes,
    ],

    mapLegendButtonClicked: [
      ...toggleMapLegend,
    ],
  })
}
