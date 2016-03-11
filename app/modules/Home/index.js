import { selectNote } from './chains';
import { textInputChanged } from './chains';
import { changeSortMode } from './chains';
import { changeShowHideState } from './chains';
import uuid from 'uuid';
import tree from './stateTree.js';

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

      clickedShowHideButton: [
        changeShowHideState
      ],
    })
  };
}
