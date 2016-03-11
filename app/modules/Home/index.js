import { selectNote } from './chains';
import uuid from 'uuid';
import tree from './stateTree.js';
import { dropPoint } from './mapchain';

export default (options = {}) => {
  return (module, controller) => {
    module.addState(
      tree
    );

    module.addSignals({
      noteAdded: [
        
      ],

      noteSelected: [
        ...selectNote
      ], 

      noteRemoved: [

      ],
 
      noteTextChanged: [

      ],

			mouseDownOnMap: [
				...dropPoint
			],
    })
  };
}
