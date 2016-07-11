import uuid from 'uuid';

var tree = {
 
  dummy_value: 27,
  
  yield_revs: {},

  user: {},
  
  token: {},
  
  live_data: false,

  model: {
    available_geohashes: {},
    current_geohashes: {},
    selected_note: {},
    notes: initial_notes(), //initial_notes(),
    tags: initial_tags(),
    edit_tags: {
      input_text:'',
      visible: false,
      note_id: {},
      completions: [],
      temp_tags: [],
    },
    fields: {
      Smith40: {
        name: 'Smith40',
        area_acres: '40',
      },
    }, 
  },
  view: {
    sort_mode: 'all', //'all' 'fields' 'tags'
    map: {$isLoading: true},
    dragMode: true,
    drawing: false,
  }
}; 

function initial_tags() {
  var text1 = 'herbicide';
  var text2 = 'low area';
  var tags_list = {};
  tags_list[text1] = {text: text1, references: 1};
  tags_list[text2] = {text: text2, references: 1};
  return tags_list;
}

function initial_notes() { 
  var notes_list = {};
//  for (var i = 1; i<4;i++) {
  for (var i = 1; i<3;i++) {
    var col = '#'+(Math.round(Math.random()* 127) + 127).toString(16)+(Math.round(Math.random()* 127) + 127).toString(16)+(Math.round(Math.random()* 127) + 127).toString(16);
    var note = {
      text: 'n-serve test',
      tags: [],//['application', 
      fields: ['Bair100'],
//      geometry: [{latitude: 40.858384, longitude: -86.138859},{latitude: 40.851257, longitude: -86.138790}, {latitude: 40.851244, longitude: -86.139479}, {latitude: 40.858316, longitude: -86.139746}],
      geometry: {"type":"Polygon","coordinates":[[
        [-86.138859, 40.858384],
        [-86.138790, 40.851257],
        [-86.139479, 40.851244],
        [-86.139746, 40.858316],
      ]]},

      geojson_visible: 'Show',
      tags_modal_visibility: false,
      geometry_visible: true,
      color: col,
      completions: [],
      selected: false,
    };
    if (i === 2) {
      var col = '#'+(Math.round(Math.random()* 127) + 127).toString(16)+(Math.round(Math.random()* 127) + 127).toString(16)+(Math.round(Math.random()* 127) + 127).toString(16);
      var text = 'low area';
      note = {
        text: 'rootworm damage',
        tags: ['low area'],
        fields: ['Bair100'],
//        geometry: [{latitude:40.854786, longitude: -86.142976},{latitude: 40.854748, longitude: -86.142987}, {latitude: 40.854741, longitude: -86.143324}, {latitude: 40.854753, longitude: -86.143646}, {latitude: 40.854783, longitude: -86.143833}, {latitude: 40.854793, longitude: -86.143336}],
        geometry: {"type":"Polygon","coordinates":[[
          [-86.142976, 40.854786],
          [-86.142987, 40.854748],
          [-86.143324, 40.854741],
          [-86.143646, 40.854753],
          [-86.143833, 40.854783],
          [-86.143336, 40.854793],
        ]]},

        geojson_visible: 'Show',
        tags_modal_visibility: false,
        geometry_visible: true,
        color: col,
        completions: [],
        selected: false,
      };
    }
    if (i === 3) {
      var col = '#'+(Math.round(Math.random()* 127) + 127).toString(16)+(Math.round(Math.random()* 127) + 127).toString(16)+(Math.round(Math.random()* 127) + 127).toString(16);
      note = {
        text: 'applied snake oil',
        tags: [],
        fields: ['Smith40'],
        geometry: [{latitude:40.854786, longitude: -86.142976},{latitude: 40.854748, longitude: -86.142987}, {latitude: 40.854741, longitude: -86.143324}, {latitude: 40.854753, longitude: -86.143646}, {latitude: 40.854783, longitude: -86.143833}, {latitude: 40.854793, longitude: -86.143336}],
//        geojson:
//          {"type":"FeatureCollection","properties":{"kind":"state","state":"IN"},"features":[
//          {"type":"Feature","properties":{"kind":"county","name":"Tippecanoe","state":"IN"},"geometry":{"type":"MultiPolygon","coordinates":[[[[-87.0964,40.5603],[-86.7733,40.5603],[-86.6966,40.5603],[-86.6966,40.4343],[-86.6966,40.2152],[-86.9211,40.2152],[-87.0909,40.2152],[-87.0909,40.3686],[-87.0964,40.4781]]]]}}
//        ]},
        geometry_visible: true,
        color: col,
        completions: [],
        selected: false,
      };
    }
    note.order = i;
    note.id = uuid.v4();
    notes_list[note.id] = note;
  };
  return notes_list;
}

function getColor() {
  var r = (Math.round(Math.random()* 127) + 127).toString(16);
  var g = (Math.round(Math.random()* 127) + 127).toString(16);
  var b = (Math.round(Math.random()* 127) + 127).toString(16);
  return '#' + r.toString() + g.toString() + b.toString();
}

export default tree; 
