import { selectNote } from './chains';
import { textInputChanged } from './chains';
import { changeSortMode } from './chains';
import { changeShowHideState } from './chains';
import { addNewNote } from './chains';
import { removeNote } from './chains';
import { getYieldData } from './chains';
import { handleAuth } from './chains';
import { handleRequestResponse } from './chains';
import { initialize } from './chains';
import uuid from 'uuid';
import tree from './stateTree.js';
import { dropPoint } from './mapchain';
import { mouseMoveOnmap } from './mapchain';
import { mouseUpOnmap } from './mapchain';
import { ToggleMap } from './mapchain';
import { drawOnMap } from './mapchain';

export default (options = {}) => {
  return (module, controller) => {
    module.addState(
      tree
    );

    module.addSignals({

      init: [
        ...initialize
      ],
    
      recievedRequestResponse: [
        ...handleRequestResponse,
      ],

      recievedAccessToken: [
        ...handleAuth,
      ],

      mapMoved: [
        ...getYieldData
      ],

      sortingTabClicked: [
        ...changeSortMode
      ],

      noteSelected: [
        ...selectNote
      ], 

      deleteNoteButtonClicked: [
        ...removeNote
      ],
 
      noteTextChanged: [
        ...textInputChanged
      ],

			mouseDownOnMap: [
				...dropPoint
			],

			mouseMoveOnMap: [
				...mouseMoveOnmap
			],

			mouseUpOnMap: [
				...mouseUpOnmap
			],

			ToggleMapp: [
				...ToggleMap
			],

			DrawMode: [
				...drawOnMap
			],

      clickedShowHideButton: [
        ...changeShowHideState
      ],


      addNoteButtonClicked: [
        ...addNewNote,
      ],

    })
  };
}
