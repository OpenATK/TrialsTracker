import { equals, when, set, unset, toggle, wait } from 'cerebral/operators';
import { sequence } from 'cerebral'
import gh from 'ngeohash'
import uuid from 'uuid';
import rmc from 'random-material-color';
import Color from 'color';
import { yieldDataStatsForPolygon } from '../yield/utils/yieldDataStatsForPolygon';
import getFieldDataForNotes from '../fields/actions/getFieldDataForNotes';
import setFieldDataForNotes from '../fields/actions/setFieldDataForNotes';
import _ from 'lodash';
import {state, props } from 'cerebral/tags'
import geohashNoteIndexManager from '../yield/utils/geohashNoteIndexManager.js';
import oadaCache from '../oada/factories/cache';
import * as oada from '../oada/sequences.js'
let cache = oadaCache(null, 'oada');

//TODO: Should the DELETE operation follow with a GET to propagate it back to
// the cerebral state?
//
//

export const fetch = sequence('oada.fetch', [
	({props}) => ({
		path: '/bookmarks/notes',
	}),
	oada.fetchTree, 
	when(state`oada.bookmarks.notes`), {
		true: sequence('fetchNotesSuccess', [
			({state, props}) => {
				let path = props.path.split('/').join('.');
				state.set(props.path.split('/').filter(n => n && true).join('.'), props.result);
      },
			mapOadaToRecords,
		]),
		false: sequence('fetchNotesFailed', [
			({props}) => ({
				contentType: 'application/vnd.oada.yield.1+json',
				path: '/bookmarks/notes',
				data: {},
				linkToId: false,
			}),
			oada.createResourceAndLink
		])
	}
])

export const init = sequence('notes.init', [
	oada.authorize,
	fetch
])

function mapOadaToRecords({state, props}) {
	state.set('notes.notes', {});
	let notes =  state.get('oada.bookmarks.notes');
	Object.keys(notes).forEach((key) => {
		// ignore reserved keys used by oada
		if (key.charAt(0) !== '_') state.set(`notes.notes.${notes[key].id}`, notes[key])
	})
}

export var toggleComparisonsPane = [
  toggle(state`${props`path`}.expanded`)
]

export var cancelNote = [
  set(state`app.view.editing`, false),
  unset(state`notes.selected_note`),
  unset(state`notes.notes.${props`id`}`)
]

export var toggleNoteDropdown = [
  set(state`app.view.note_dropdown.note`, props`id`),
  toggle(state`app.view.note_dropdown.visible`),
];

export var addTag = [
  set(state`app.model.tag_input_text`, ''),
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

export var selectNote = [
	set(state`notes.selected_note`, props`id`)
]

export let drawComplete = [
	set(state`app.view.editing`, false), 
	set(state`notes.notes.${props`id`}.stats.computing`, true),
	set(props`geometry`, state`notes.notes.${props`id`}.geometry`),
	getGeohashesForPolygon, {
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
	unset(state`notes.selected_note`),
  set(state`app.view.editing`, false),
];

export var enterNoteEditMode = [
  set(state`app.view.editing`, true),
  ...selectNote,
];

export var exitNoteEditMode = [
  set(state`app.view.editing`, false),
];

export var changeSortMode = [
  set(state`app.view.sort_mode`, props`newSortMode`),
];

export var removeNote = [
	set(state`app.view.editing`, false),
	checkTags,
	({state, props}) => ({
		path: '/bookmarks/notes/'+state.get(`notes.notes.${props.id}._id`).replace(/^\/?resources\//, ''),
	}),
	oada.oadaDelete,
	unset(state`notes.selected_note`),
	mapOadaToRecords,
	//  unset(state`notes.notes.${props`id`}`),
];

export var updateNoteText = [
  setNoteText,
];

export var updateTagText = [
	unset(state`notes.notes.${state`notes.selected_note`}.tag_error`),
  set(state`app.model.tag_input_text`, props`value`),
];

export var addNewNote = [
//TODO: perhaps restrict whether a note can be added while another is editted
	unset(state`notes.selected_note`),
	createNote, 
	({props, state}) => ({
		data: props.note,
		contentType: 'application/vnd.oada.yield.1+json',
		path: '/bookmarks/notes',
		linkToId: true
	}),
	oada.createResourceAndLink,
	mapOadaToRecords,
	set(state`notes.selected_note`, props`note.id`),
	set(state`app.view.editing`, true),
];

export var changeShowHideState = [
  changeShowHide, 
];

export var handleNoteClick = [
	mapToNotePolygon,
  when(state`app.view.editing`), {
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

function getGeohashesForPolygon({props, state, path}) {
	if (props.geometry && props.geometry.geojson && props.geometry.geojson.coordinates && props.geometry.bbox) {
		return yieldDataStatsForPolygon(props.geometry.geojson.coordinates[0], props.geometry.bbox).then((geohashes) => {
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
	} else {
		return path.error({})
	}
}

function computeNoteStats({props, state, path}) {
	let token = state.get('Connections.oada_token');
	let domain = state.get('Connections.oada_domain');
	let stats = {};
	let availableGeohashes = state.get('yield.data_index');
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

  var note = {
    created: Date.now(),
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
    stats: {},
  };
  note.font_color = getFontColor(note.color);
	return {note}
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

