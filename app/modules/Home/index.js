import { selectNote } from './chains';
import { textInputChanged } from './chains';
import { changeSortMode } from './chains';
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
      sortingTabClicked: [
      ...changeSortMode
      ],

      noteAdded: [
        
      ],

      noteSelected: [
        ...selectNote
      ], 

      noteRemoved: [

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
    })
  };
}
