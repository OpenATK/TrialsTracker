import stateTree from './stateTree.js';

import { selectNote } from './chains';
import { textInputChanged } from './chains';
import { changeSortMode } from './chains';
import { changeShowHideState } from './chains';
import { addNewNote } from './chains';
import { removeNote } from './chains';
import { getYieldData } from './chains';
import { initialize } from './chains';
import { handleNoteClick } from './chains';
import { startStopLiveData } from './chains';
import { makeLiveDataRequest } from './chains';
import { addGeohashes } from './chains';
import { removeGeohashes } from './chains';
import { addTag } from './chains';
import { handleNoteListClick } from './chains';
import { enterNoteEditMode } from './chains';
import { removeTag } from './chains';
import { clearCache } from './chains';

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

    clearCacheButtonClicked: [
      ...clearCache,
    ],

    startStopLiveDataButtonClicked: [
      ...startStopLiveData,
   ],

   liveDataRequested: [
     ...makeLiveDataRequest,
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
      ...drawComplete,
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
      chain: [...textInputChanged],
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

  })
}
