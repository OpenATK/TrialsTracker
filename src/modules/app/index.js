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
import { startStopLiveData } from './chains';
//import { makeLiveDataRequest } from './chains';
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

import { drawComplete } from './map-chains';
import { handleMouseDown } from './map-chains';
import { mouseMoveOnmap } from './map-chains';
import { mouseUpOnmap } from './map-chains';
import { ToggleMap } from './map-chains';
import { drawOnMap } from './map-chains';
import { handleDoneDrawing } from './map-chains';

export default (module) => {
  module.addState(
    stateTree
  )

  module.addSignals({

    init: [
      ...initialize
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

    startStopLiveDataButtonClicked: [
      ...startStopLiveData,
   ],

   //liveDataRequested: [
   //  ...makeLiveDataRequest,
   //],

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
      ...handleMouseDown
    ],

    mouseMoveOnMap: [
      ...mouseMoveOnmap
    ],

    mouseUpOnMap: [
      ...mouseUpOnmap
    ],

    ToggleMap: [
      ...ToggleMap
    ],

    DrawMode: [
      ...drawOnMap
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

  })
}
