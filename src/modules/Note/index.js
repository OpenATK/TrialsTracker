import { 
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
  cancelNote,
} from './chains';
import { drawComplete } from '../Map/chains'

export default {

  signals: {

    addNoteButtonClicked: addNewNote,

    cancelEditingButtonClicked: cancelNote,

    deleteNoteButtonClicked: removeNote,

    doneEditingButtonClicked: [
      ...drawComplete, ...exitNoteEditMode
    ],

    editNoteButtonClicked: [
      ...enterNoteEditMode, ...toggleNoteDropdown,
    ],

    noteBackgroundClicked: toggleNoteDropdown,

    noteClicked: handleNoteClick,

    noteListClicked: handleNoteListClick,

    noteTextChanged: {
      chain: [...updateNoteText],
      immediate: true,
    },

    showHideButtonClicked: changeShowHideState,

    showNoteDropdown: toggleNoteDropdown,

    sortingTabClicked: changeSortMode,

    tagAdded: addTag, 

    tagInputTextChanged: {
      chain: [...updateTagText],
      immediate: true,
    },

    tagRemoved: removeTag,

  }
}
