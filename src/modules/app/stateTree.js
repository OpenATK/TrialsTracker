import uuid from 'uuid';

var stateTree = {
  yield_revs: {},
  user: {},
  token: {},
  live_data: false,
  offline: true,

  model: {
    geohashes_to_draw: [],
    geohashes_on_screen: {},
    available_geohashes: {},
    current_geohashes: {},
    selected_note: {},
    notes: initial_notes(),
    tags: initial_tags(),
    tag_input_text: '',
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
    editing_note: false,
    legends: {
      Corn: [{
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

      Soybeans: [{ 
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
      Wheat: [{ 
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
    var time = new Date(2015, 5, 17, 15);
    var col = '#'+(Math.round(Math.random()* 127) + 127).toString(16)+(Math.round(Math.random()* 127) + 127).toString(16)+(Math.round(Math.random()* 127) + 127).toString(16);
    var note = {
      time: time,
      text: 'n-serve test',
      tags: [],//['application', 
      fields: ['Bair100'],
      area: 17.34,
//      geometry: [{latitude: 40.858384, longitude: -86.138859},{latitude: 40.851257, longitude: -86.138790}, {latitude: 40.851244, longitude: -86.139479}, {latitude: 40.858316, longitude: -86.139746}],
      geometry: {"type":"Polygon","coordinates":[[
        [-86.14511646330357,40.85140222836006],
        [-86.14514864981174,40.85454280724172],
        [-86.142852678895,40.85460772719846],
        [-86.14272393286228,40.85136165143138],
        [-86.14511646330357,40.85140222836006],
      ]]},

      geojson_visible: 'Show',
      tags_modal_visibility: false,
      geometry_visible: true,
      color: '#99e7c1',
      completions: [],
      selected: false,
      mean: 155.26,
    };
    if (i === 2) {
      var time = new Date(2015, 9, 22, 18);
      var col = '#cce6ff';
      var text = 'low area';
      note = {
        text: 'rootworm damage',
        time: time,
        tags: ['low area'],
        area: 1.38,
        mean: 135.78,
        fields: ['Bair100'],
//        geometry: [{latitude:40.854786, longitude: -86.142976},{latitude: 40.854748, longitude: -86.142987}, {latitude: 40.854741, longitude: -86.143324}, {latitude: 40.854753, longitude: -86.143646}, {latitude: 40.854783, longitude: -86.143833}, {latitude: 40.854793, longitude: -86.143336}],
        geometry: {"type":"Polygon","coordinates":[[
          [-86.13909758627415,40.85276559871832],
          [-86.1392692476511,40.85284675083119],
          [-86.1393765360117,40.85322816443017],
          [-86.13941945135593,40.85365015138538],
          [-86.13936580717564,40.85405590553835],
          [-86.1391619592905,40.85416140121109],
          [-86.13901175558567,40.854104595869714],
          [-86.13894738256931,40.85400721517121],
          [-86.13895811140536,40.85374753260873],
          [-86.13895811140536,40.85356088513822],
          [-86.13895811140536,40.85338235228311],
          [-86.13891519606113,40.85319570378382],
          [-86.13880790770054,40.853009054758715],
          [-86.13882936537266,40.85286298124183],
          [-86.13889373838902,40.85275748350158]
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
      var time = new Date(2015, 6, 20, 11);
      var col = '#'+(Math.round(Math.random()* 127) + 127).toString(16)+(Math.round(Math.random()* 127) + 127).toString(16)+(Math.round(Math.random()* 127) + 127).toString(16);
      note = {
        time: time,
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

export default stateTree; 
