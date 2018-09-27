let stateTree = {

	model: {
    tags: initial_tags(),
  },
  view: {
    note_dropdown: {
      visible: false,
      note: '',
    },
    note_error: '',
    tag_input_text: '',
    crop_dropdown_visible: false,
    sort_mode: 0, //0 - notes; 1 - fields; 2 - tags; 3 - search;
    editing: false,
  }
}; 

function initial_tags() {
  let text1 = 'herbicide';
  let text2 = 'low area';
  let tags_list = {};
  tags_list[text1] = {text: text1, references: 1};
  tags_list[text2] = {text: text2, references: 1};
  return tags_list;
}



export default stateTree; 
