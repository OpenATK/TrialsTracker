let stateTree = {

	model: {
    tags: initial_tags(),
  },
  is_mobile: false,
  settings: {
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
    settings: {
    },
    legend: {
      visible: false,
    },
    legends: {
      corn: [{
        value: 130,
        color: {
          r: 255,
          g: 0,
          b: 0, 
          a: 255,
        },
      },{
        value: ((225-130)/2)+130,
        color: {
          r: 255,
          g: 255,
          b: 0,
          a: 255,
        },
      },{ 
        value: 225,
        color: {
          r: 0,
          g: 255,
          b: 0,
          a: 255,
        },
      }],

      soybeans: [{ 
        value: 30,
        color: { 
          r: 255,
          g: 0,
          b: 0,
          a: 255,
        },
      },{
        value: ((65-30)/2)+30,
        color: {
          r: 255,
          g: 255,
          b: 0,
          a: 255,
        }, 
      },{
        value: 65,
        color: {
          r: 0,
          g: 255,
          b: 0,
          a: 255,
        },
      }],
      wheat: [{ 
        value: 40,
        color: { 
          r: 255,
          g: 0,
          b: 0,
          a: 255,
        },
      },{
        value: ((80-40)/2)+40,
        color: {
          r: 255,
          g: 255,
          b: 0,
          a: 255,
        }, 
      },{
        value: 80,
        color: {
          r: 0,
          g: 255,
          b: 0,
          a: 255,
        },
      }],
    },
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
