import { equals, when, set, unset, toggle, wait } from 'cerebral/operators';
import { sequence } from 'cerebral'
import gh from 'ngeohash'
import uuid from 'uuid';
import rmc from 'random-material-color';
import Color from 'color';
import { yieldDataStatsForPolygon } from '../Yield/utils/yieldDataStatsForPolygon';
import getFieldDataForNotes from '../fields/actions/getFieldDataForNotes';
import setFieldDataForNotes from '../fields/actions/setFieldDataForNotes';
import _ from 'lodash';
import {state, props } from 'cerebral/tags'
import geohashNoteIndexManager from '../Yield/utils/geohashNoteIndexManager.js';
import oadaCache from '../oada/factories/cache';
import * as oada from '../oada/sequences.js'
let cache = oadaCache(null, 'oada');

export const fetch = sequence('notes.fetch', [
	({props}) => ({
		path: '/bookmarks/notes'
	}),
	oada.fetchTree,
	//	mapOadaToRecords,
])

export const init = sequence('notes.init', [
	oada.init,
	fetch
])


function mapOadaToRecords({state, props}) {
	return Promise.map(Object.keys(state.get('oada.notes') || {}), (key) => {
		
	})
}


export var toggleComparisonsPane = [
  toggle(state`${props`path`}.expanded`)
]

export var cancelNote = [
  set(state`App.view.editing`, false),
  unset(state`notes.selected_note`),
  unset(state`notes.notes.${props`id`}`)
]

export var toggleNoteDropdown = [
  set(state`App.view.note_dropdown.note`, props`id`),
  toggle(state`App.view.note_dropdown.visible`),
];

export var addTag = [
  set(state`App.model.tag_input_text`, ''),
	addTagToNote, {
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
	},
];

export var removeTag = [
  unset(state`notes.notes.${state`notes.selected_note`}.tags.${props`idx`}`),
	removeTagFromAllTagsList,
];

export var deselectNote = [
  when(state`notes.selected_note`), {
		true: [
			set(state`notes.notes.${state`notes.selected_note`}.selected`, false),
			unset(state`notes.selected_note`),
		],
		false: [],
	},
];

export var selectNote = [
	when(state`notes.selected_note`), {
		true: [toggle(state`notes.notes.${state`notes.selected_note`}.selected`),],
		false: [],
	},
  toggle(state`notes.notes.${props`id`}.selected`),
	set(state`notes.selected_note`, props`id`)
]

export let drawComplete = [
	set(state`App.view.editing`, false), 
	set(state`notes.notes.${props`id`}.stats.computing`, true),
  getNoteGeohashes, {
		success: [
      set(state`Map.geohashPolygons`, props`geohashPolygons`),
		],/*
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
			*/
		error: [
      unset(state`notes.notes.${props`id`}.stats.computing`)
  	],
  },
];

export var handleNoteListClick = [
  ...deselectNote, 
  set(state`App.view.editing`, false),
];

export var enterNoteEditMode = [
  set(state`App.view.editing`, true),
  ...selectNote,
];

export var exitNoteEditMode = [
  set(state`App.view.editing`, false),
];

export var changeSortMode = [
  set(state`App.view.sort_mode`, props`newSortMode`),
];

export var removeNote = [
	set(state`App.view.editing`, false),
	equals(state`notes.selected_note`), {
		[props`id`]: deselectNote,
		otherwise: []
	},
  checkTags, 
  deleteNote, 
];

export var updateNoteText = [
  setNoteText,
];

export var updateTagText = [
	unset(state`notes.notes.${state`notes.selected_note`}.tag_error`),
  set(state`App.model.tag_input_text`, props`value`),
];

export var addNewNote = [
//TODO: perhaps restrict whether a note can be added while another is editted
  ...deselectNote,
	createNote, 
	({props, state}) => ({
		contentType: 'application/vnd.oada.yield.1+json',
		path: '/notes/'
	}),
	oada.postAndLink,
	mapOadaToRecords,
	set(state`App.view.editing`, true),
];

export var changeShowHideState = [
  changeShowHide, 
];

export var handleNoteClick = [
	mapToNotePolygon,
  when(state`App.view.editing`), {
    true: [],
		false: [
      ...selectNote, 
    ],
  },
];

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
			return {"type":"Polygon","coordinates": [[
				[ghBox[1], ghBox[2]],
				[ghBox[3], ghBox[2]],
				[ghBox[3], ghBox[0]],
				[ghBox[1], ghBox[0]],
				[ghBox[1], ghBox[2]],
			]]}
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
  var geometryVisible = state.get(`notes.notes.${props.id}.geometry`, 'visible');
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

  var note = {
    time: Date.now(),
    id: uuid.v4(),
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
  note.font_color = getFontColor(note.color);
  state.set(`notes.notes.${note.id}`, note);
	state.set('notes.selected_note', note.id);
	return {data: note}
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
  var allTags = state.get(['App', 'model', 'tags']);
  var noteTags = state.get(`notes.notes.${props.id}.tags`);
  noteTags.forEach((tag) => {
    if (allTags[tag].references <= 1) {
      state.unset(['App', 'model', 'tags', tag]); 
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

function addTagToNote({props, state, path}) {
	var id = state.get('notes.selected_note');
	var tags = state.get(`notes.notes.${id}.tags`);
	props.text = props.text.toLowerCase();
	if (props.text === '') {
		return path.error({message: 'Tag text required'})
	} else if (tags.indexOf(props.text) > -1) {
		return path.error({message: 'Tag already applied'})
	} else {
		state.push(`notes.notes.${id}.tags`, props.text);
		return path.success()
	}
};

function addTagToAllTagsList({props, state}) {
  var allTags = state.get(['App', 'model', 'tags']);
  if (!allTags[props.text]) {
    state.set(['App', 'model', 'tags', props.text], { 
      text: props.text,
      references: 1
    });
  } else {
    state.set(['App', 'model', 'tags', props.text, 'references'], allTags[props.text].references+1);
  }
};

function removeTagFromAllTagsList({props, state}) {
  var refs = state.get(['App', 'model', 'tags', props.tag, 'references']);
  if (refs === 0) {
    state.unset(['App', 'model', 'tags', props.tag]);
  } else {
    state.set(['App', 'model', 'tags', props.tag, 'references'], refs - 1);
  }
};

