import Controller from 'cerebral';
import Model from 'cerebral-baobab';
import request from 'superagent';

// Any Baobab options
const options = {

};

// The initial state of the application
const model = Model({
  model: {
    selected_note: {},
//    notes: initial_notes(), 
//    tags: initial_tags(),
    tags_modal: {
      input_text:'',
      visible: false,
      note_id: {},
      completions: [],
      temp_tags: [],
    },
  },
  view: {
    tags_modal: false,
    tags_modal_note_id: {},
    tags_modal_completions: [],
    sort_mode: 'all', //'all' 'fields' 'tags'
    map: {$isLoading: true},
  }
}, options);

// You have access to the Baobab tree itself
model.tree.on('invalid', function () {

});

// Any utils you want each action to receive
const services = {
  request: request
};

// Instantiate the controller
export default Controller(model, services);
