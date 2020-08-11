import { createMutationOperator, mutate, pipe, equals, when, set, unset, wait } from 'overmind';
import gh from 'ngeohash'
import {v1 as uuid} from 'uuid';
import rmc from 'random-material-color';
import Color from 'color';
import yieldDataStatsForPolygon from '../yield/utils/yieldDataStatsForPolygon';
//import getFieldDataForNotes from '../Fields/actions/getFieldDataForNotes';
//import setFieldDataForNotes from '../Fields/actions/setFieldDataForNotes';
import _ from 'lodash';
import geohashNoteIndexManager from '../yield/utils/geohashNoteIndexManager.js';
import oadaCache from '../../modules/OADA/factories/cache';

let cache = oadaCache(null, 'oada');

export const toggle = (operation) => {
  return createMutationOperator(
    'toggle', 
    operation.name, 
    (err, context, value, next) => {
      if (err) next(err, value)
      else {
        operation(context, value)
        next(null, value)
      }
    }
  )
      /*
      else {
        operation(context, next(null, ({state}, path) => {
        if (state[path]) {
          state[path] = false;
        } else {
          state[path] = true;
        }
      }
      }*/
}

export default {

  initialize({state}) {

  },
  cancelNote({state}, id) {
    state.app.view.editing = false;
    state.notes.selected_note = undefined;
    state.notes.notes[id] = undefined;
  },
  toggleNoteDropdown: pipe(
    mutate(({state}, id) => {
      state.app.view.note_dropdown.note = id;
    }),
    toggle('app.view.note_dropdown.visible'),
  ),

  addTag: pipe(
    mutate(({state}) => {
      state.app.model.tag_input_text = '';
    }),
    addTagToNote, /*{
      error: [
        set(state`notes.notes.${state`notes.selected_note`}.tag_error`, props`message`),
        wait(2000), {
          continue: [
            unset(state`notes.notes.${state`notes.selected_note`}.tag_error`),
          ]
        }
      ],
      success: [
        addTagToAllTagsList, 
      ]
    },*/
  ),

  removeTag: pipe(
    mutate(({state}, idx) => {
      let selectedNote = state.notes.selected_note;
      if (selectedNote) state.notes.notes[selectedNote].tags.splice(idx, 1);
    }),
    removeTagFromAllTagsList,
  )
/*
  deselectNote = [
    when(state`notes.selected_note`), {
      true: [
        set(state`notes.notes.${state`notes.selected_note`}.selected`, false),
        unset(state`notes.selected_note`),
      ],
      false: [],
    },
  ];

  selectNote = [
    when(state`notes.selected_note`), {
      true: [toggle(state`notes.notes.${state`notes.selected_note`}.selected`),],
      false: [],
    },
    toggle(state`notes.notes.${props`id`}.selected`),
    set(state`notes.selected_note`, props`id`)
  ]

  export let drawComplete = [
    set(state`app.view.editing`, false), 
    set(state`notes.notes.${props`id`}.stats.computing`, true),
    getNoteGeohashes, {
      success: [
        addNoteToGeohashIndex,
        computeNoteStats, {
          success: [
            setNoteStats,
              getFieldDataForNotes, {
              success: [setFieldDataForNotes],
              error: [],
            }
          ],
          error: [],
        },
        set(state`Map.geohashPolygons`, props`geohashPolygons`),
        set(props`notes.${props`id`}`, state`notes.notes.${props`id`}`),
      ],
      error: [
        unset(state`notes.notes.${props`id`}.stats.computing`)
      ],
    },
  ];

  handleNoteListClick = [
    ...deselectNote, 
    set(state`app.view.editing`, false),
  ];

  enterNoteEditMode = [
    set(state`app.view.editing`, true),
    ...selectNote,
  ];

  exitNoteEditMode = [
    set(state`app.view.editing`, false),
  ];

  changeSortMode = [
    set(state`app.view.sort_mode`, props`newSortMode`),
  ];

  removeNote = [
    set(state`app.view.editing`, false),
    equals(state`notes.selected_note`), {
      [props`id`]: deselectNote,
      otherwise: []
    },
    checkTags, 
    deleteNote, 
  ];

  updateNoteText = [
    setNoteText,
  ];

  updateTagText = [
    unset(state`notes.notes.${state`notes.selected_note`}.tag_error`),
    set(state`app.model.tag_input_text`, props`value`),
  ];

  addNewNote = [
  //TODO: perhaps restrict whether a note can be added while another is editted
    ...deselectNote,
    createNote, 
    set(state`app.view.editing`, true),
  ];

  changeShowHideState = [
    changeShowHide, 
  ];

  handleNoteClick = [
    mapToNotePolygon,
    when(state`app.view.editing`), {
      true: [],
      false: [
        ...selectNote, 
      ],
    },
  ];
  */
}


function addNoteToGeohashIndex({props, state, path}) {
  props.geohashes.forEach((geohash) => {
    geohashNoteIndexManager.set(geohash, props.id);
  })
}

function getNoteGeohashes({props, state, path}) {
  let geometry = state.get(`notes.notes.${props.id}.geometry`);
  return yieldDataStatsForPolygon(geometry.geojson.coordinates[0], geometry.bbox).then((geohashes) => {
    let geohashPolygons = geohashes.map((geohash) => {
      let ghBox = gh.decode_bbox(geohash);
      //create an array of vertices in the order [nw, ne, se, sw]
      let geohashPolygon = [
        [ghBox[1], ghBox[2]],
        [ghBox[3], ghBox[2]],
        [ghBox[3], ghBox[0]],
        [ghBox[1], ghBox[0]],
        [ghBox[1], ghBox[2]],
      ];
      return {"type":"Polygon","coordinates": [geohashPolygon]}
    })
    return path.success({geohashes, geohashPolygons, ids:[props.id]});
  })
}

function computeNoteStats({props, state, path}) {
  let token = state.get('Connections.oada_token');
  let domain = state.get('Connections.oada_domain');
  let stats = {};
  let availableGeohashes = state.get('Yield.data_index');
  return Promise.map(Object.keys(availableGeohashes), (crop) => {
    stats[crop] = { 
      area: {
        sum: 0,
        sum_of_squares: 0,
      },
      weight: {
        sum: 0,
        sum_of_squares: 0,
      },
      count: 0,
      yield: { mean: 0, variance: 0, standardDeviation: 0},
      'sum-yield-squared-area': 0,
    }; 
    return Promise.map(props.geohashes, async (geohash) => {
      if (geohash.length < 3) {
        //TODO: handle this.  You' can't get aggregates of geohash-1 and 2
      }
      if (!availableGeohashes[crop]['geohash-'+(geohash.length-2)]) return
      if (!availableGeohashes[crop]['geohash-'+(geohash.length-2)][geohash.substring(0, geohash.length-2)]) return
      let url = '/harvest/tiled-maps/dry-yield-map/crop-index/'+crop+'/geohash-length-index/geohash-'+(geohash.length-2)+'/geohash-index/'+geohash.substring(0, geohash.length-2);
      let data = await cache.get(domain, token, url)
      data = data['geohash-data'][geohash]
      if (!data) return
      stats[crop].area.sum += data.area.sum;
      stats[crop].area.sum_of_squares += data.area['sum-of-squares'];
      stats[crop].weight.sum += data.weight.sum;
      stats[crop].weight.sum_of_squares += data.weight['sum-of-squares'];
      stats[crop].count += data.count;
      stats[crop]['sum-yield-squared-area'] += data['sum-yield-squared-area'];
      return
    }).then(() => {
      stats[crop].yield = {}
      stats[crop].yield.mean = stats[crop].weight.sum/stats[crop].area.sum;
      stats[crop].yield.variance = (stats[crop]['sum-yield-squared-area']/stats[crop].area.sum) - Math.pow(stats[crop].yield.mean, 2);
      stats[crop].yield.standardDeviation = Math.pow(stats[crop].yield.variance,  0.5);
      stats[crop]['sum-yield-squared-area'] = stats[crop]['sum-yield-squared-area'];
      if (stats[crop].count === 0) delete stats[crop]
      return
    })
  }).then(() => {
    return path.success({stats})
  }).catch((err) => {
    throw err
  })
}

function setNoteStats({props, state}) {
  Object.keys(props.stats).forEach((crop) => {
    state.set(`notes.notes.${props.id}.stats`, props.stats);
  })
  state.unset(`notes.notes.${props.id}.stats.computing`);
}

function mapToNotePolygon({props, state}) {
  var note = state.get(`notes.notes.${props.id}`);
  if (note) state.set('Map.center', note.geometry.centroid);
}

function changeShowHide ({props, state}) {
  var geometryVisible = state.get(`Note.notes.${props.id}.geometry`, 'visible');
  if (geometryVisible) {
    state.set(`notes.notes.${props.id}.geometry.visible`, false);
  } else {
    state.set(`notes.notes.${props.id}.geometry.visible`, true);
  }
};

function setNoteText ({props, state}) {
  state.set(`notes.notes.${props.id}.text`, props.value);
};

function createNote({props, state}) {
  var notes = state.get(`notes.notes`);
  Object.keys(notes).forEach((note) => {
    state.set(`notes.notes.${note}.order`, notes[note].order +1);
  })

  var newNote = {
    time: Date.now(),
    id: uuid(),
    text: '',
    tags: [],
    fields: {},
    geometry: { 
      geojson: {
        "type":"Polygon",
        "coordinates": [[]],
      },
      bbox: {},
      centroid: [],
      visible: true,
    },
    color: rmc.getColor(),
    completions: [],
    selected: true,
    stats: {},
    order: 0,
  };
  newNote.font_color = getFontColor(newNote.color);
  state.set(`notes.notes.${newNote.id}`, newNote);
  state.set('notes.selected_note', newNote.id);
};

function getFontColor(color) {
  var L = Color(color).luminosity();
  if (L > 0.179) {
    return '#000000';
  } else {
    return '#ffffff';
  }
}

function checkTags ({props, state}) {
  var allTags = state.get(['app', 'model', 'tags']);
  var noteTags = state.get(`notes.notes.${props.id}.tags`);
  noteTags.forEach((tag) => {
    if (allTags[tag].references <= 1) {
      state.unset(['app', 'model', 'tags', tag]); 
    }
  })
}

function deleteNote({props, state}) {
  state.unset(`notes.notes.${props.id}`); 
  var notes = state.get('notes.notes');
  Object.keys(notes).forEach((id) => {
    if (notes[id].order > props.id) {
      state.set(`notes.notes.${id}.order`, notes[id].order);
    }
  })
};

function addTagToNote({state}, text) {
  var id = state.notes.selected_note;
  var tags = state.notes.notes[id].tags;
  text = text.toLowerCase();
  if (text === '') {
    state.notes.tagError = 'Tag text required'
  } else if (tags.indexOf(text) > -1) {
    state.notes.tagError = 'Tag already applied';
  } else {
    state.notes.notes[id].tags.push(text);
  }
};

function addTagToAllTagsList({props, state}) {
  var allTags = state.get(['app', 'model', 'tags']);
  if (!allTags[props.text]) {
    state.set(['app', 'model', 'tags', props.text], { 
      text: props.text,
      references: 1
    });
  } else {
    state.set(['app', 'model', 'tags', props.text, 'references'], allTags[props.text].references+1);
  }
};

function removeTagFromAllTagsList({props, state}) {
  var refs = state.get(['app', 'model', 'tags', props.tag, 'references']);
  if (refs === 0) {
    state.unset(['app', 'model', 'tags', props.tag]);
  } else {
    state.set(['app', 'model', 'tags', props.tag, 'references'], refs - 1);
  }
};
