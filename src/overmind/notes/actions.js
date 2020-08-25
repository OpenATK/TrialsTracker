import { createMutationOperator, mutate, pipe, equals, when, set, unset, wait } from 'overmind';
import md5 from 'md5'
import gh from 'ngeohash'
import {v1 as uuid} from 'uuid';
import rmc from 'random-material-color';
import Color from 'color';
import Promise from 'bluebird';
import yieldDataStatsForPolygon from '../yield/utils/yieldDataStatsForPolygon';
//import getFieldDataForNotes from '../Fields/actions/getFieldDataForNotes';
//import setFieldDataForNotes from '../Fields/actions/setFieldDataForNotes';
import _ from 'lodash';
import geohashNoteIndexManager from '../yield/utils/geohashNoteIndexManager.js';
import oadaCache from '../../modules/OADA/factories/cache';
import harvest from '../yield/getHarvest'
import polygonsIntersect from '../view/Map/utils/polygonsIntersect';
//import { checkFieldNotes } from './fields'
import urlLib from 'url'
import gaussian from 'gaussian';
//import * as fields from '@oada/fields-module/sequences';
//import * as yieldMod from '../yield/sequences.js';
//import * as map from '../map/sequences.js';
//import { state, props } from 'cerebral/tags'
//import oadaMod from '@oada/cerebral-module/sequences'
const dist = require('gaussian')(0, 1);
const tree = require('./tree');

//TODO: replace cache with effects down below
let cache = oadaCache(null, 'oada');

export default {
  async initialize({state, actions, effects}) {
    // Get the connection from the login service
    state.notes.connection_id = state.app.OADAManager.currentConnection;
    await actions.oada.sync({
      path: '/bookmarks/notes',
      connection_id: state.app.OADAManager.currentConnection,
      tree,
      actions: actions.notes.mapOadaToRecords,
    });
    state.view.Map.layers = {
      Notes: {visible: true},
      Fields: {visible: true},
    }
    actions.notes.getTagsList();
    let notes = await actions.notes.mapOadaToRecords();
//    actions.notes.checkFieldNotes();
    let stats = actions.notes.getNoteStats(notes);
    state.notes.loading = false;
    //state.fields.loading = false;
    //getNoteComparisons,
  },
  async mapOadaToRecords({state, actions}) {
    state.notes.notes = {};
    state.notes.fields = {};
    let connection_id = state.notes.connection_id;
    let notes = {};
    var oadaNotes = state.oada[connection_id].bookmarks.notes;
    var noteTypes = Object.keys(oadaNotes || {})
    return Promise.map(noteTypes, (idx) => {
      if (idx.charAt(0) === '_') return
      var index = idx.replace(/-index/, '');
      notes[index] = notes[index] || {};
      return Promise.map(Object.keys(oadaNotes[idx] || {}), (key) => {
      // ignore reserved keys used by oada
        if (key.charAt(0) !== '_' && oadaNotes[idx][key]) {
          notes[index][key] = oadaNotes[idx][key];
        }
        return
      }).then(() => {
        state.notes[index] = notes[index];
      })
    }).then(() => {
      return {notes}
    })
  },
  handleNotesWatch({state, actions, effects}, props) {
    if (props.response.change.type === 'merge') {
      var oldState = _.cloneDeep(state.oada[props.connection_id][props.path]);
      var newState = _.merge(oldState, props.response.change.body);
      state.oada[props.connection_id][props.path] = newState;
    } else if (props.response.change.type === 'delete') {
      var nullPath = props.nullPath.replace(/^\//, '').split('/').join('.');
      delete state.oada[props.connection_id][props.path][nullPath];
    }
    actions.notes.mapOadaToRecords();
  },
  // This sequence is used to respond to the watch on /bookmarks/notes
  handleYieldStats({actions, state}, props) {
    actions.notes.getYieldStats();
    actions.notes.mapOadaToRecords();
  },
  expandComparisonsClicked({state}, props) {
//    toggle(state`notes.${props`noteType`}.${props`id`}.expanded`)
  },
  getNoteStats({actions}, props) {
    let polygons = actions.notes.getPolygons(props);
    polygons = actions.yield.getPolygonStats(polygons);
    actions.notes.createYieldStats(polygons);
    actions.notes.watchYieldStats(polygons);
  },
  // Setup watches on the yield-stats of each note so that as associated yield
  // geohashes are updated, stats on each note are recalculated
  async watchYieldStats({state, actions}, polygons) {
    let requests = polygons || []
      .filter(obj => 
        !(!obj.geohashes || !obj.stats || !obj.id || !obj.type)
      )
      .map(obj => ({
        path: `/bookmarks/notes/${obj.type}-index/${obj.id}/yield-stats`,
        watch: {
          actions: actions.notes.handleYieldStats,
          payload: {
            id: obj.id,
            noteType: obj.type,
          }
        },
      }))
    await actions.oada.get({
      requests, 
      tree, 
      connection_id: state.notes.connection_id,
    })
  },
  // Create the yield-stats key storing stat info and links to associated geohash yield buckets
  async createYieldStats({state, actions}, polygons) {
    let requests = (polygons || [])
      .filter(obj => 
        !(!obj.geohashes || !obj.stats || !obj.id || !obj.type)
      )
      .map(obj => ({
        path: `/bookmarks/notes/${obj.type}-index/${obj.id}/yield-stats`,
        data: {
          geohashes: obj.geohashes,
          stats: obj.stats,
        },
      }))
    await actions.oada.put({
      requests,
      tree,
      connection_id: state.notes.connection_id,
    })
  },
  // Create array of objects with id, polygon, bbox, type for the notes passed in via props.
  getPolygons({state}, props) {
    var polygons = [];
    return Promise.map(Object.keys(props.notes || {}), (noteType) => {
      return Promise.map(Object.keys(props.notes[noteType] || {}), (id) => {
        if (!(props.notes[noteType][id] && props.notes[noteType][id].boundary.geojson)) return
        state.notes[noteType][id]['yield-stats'] = {computing:true};
        return polygons.push({
          id,
          polygon: props.notes[noteType][id].boundary.geojson.coordinates[0] || [],
          bbox: props.notes[noteType][id].boundary.bbox || [],
          type: noteType
        })
      })
    }).then(() => {
      polygons = polygons.filter((polygon) => (polygon) ? true: false);
      return {polygons}
    })
  },
  cancelEditingButtonClicked({state}, props) {
    state.notes.editing = false;
    let { id, type } = state.notes.selectedNote;
    //delete state.notes.notes[props.id];
    state.notes.selectedNote = {};
  },
  toggleNoteDropdown({state}, {id}) {
    state.notes.noteDropdown = id;
    if (state.notes.noteDropdown.visible) {
      state.notes.noteDropdown.visible = false;
    } else {
      state.notes.noteDropdown.visible = true;
    } 
  },
  tagAdded({state,actions}, props) {
    //Have an error message in the event that text is invalid
    actions.notes.addTagToNote(props)
    state.notes.tagText = ''; 
    actions.notes.addTagToAllTagsList(props);
  },
  tagRemoved({state,actions}, {idx, tag}) {
    let selectedNote = state.notes.selectedNote;
    if (selectedNote) state.notes.notes[selectedNote].tags.splice(idx, 1);
    actions.notes.removeTagFromAllTagsList({idx, tag})
  },
  noteListClicked({actions, state}) {
    delete state.notes.selectedNote;
    state.notes.editing = false;
  },
  tabClicked({actions, state}, props) {
    state.notes.tab = props.tab;
  },

  async doneClicked({state, actions}, {id}) {
    state.notes.editing = false;
    state.notes.notes[id].stats.computing = true;
    let {geohashes, geohashPolygons} = await actions.notes.getNoteGeohashes({id});
    actions.notes.addNoteToGeohashIndex({id, geohashes});
    let {stats} = await actions.notes.computeNoteStats({id, geohashes});
    actions.notes.setNoteStats({id, stats});
//    actions.notes.getFieldDataForNotes({);
//    actions.notes.setFieldDataForNotes();
    state.view.Map.geohashPolygons = geohashPolygons;
    /*
    error: [
        unset(state`notes.notes.${props`id`}.stats.computing`)
      ],
    */
    state.notes.editing = false;
  },
  doneClicked({state, actions}, props) {
    //	set(props`note`, state`notes.${props`noteType`}.${props`id`}`)
    state.notes.editing = false;
    let noteType = state.notes.selectedNote.type;
    let id = state.notes.selectedNote.id;
    let note = actions.notes.oadaUpdateNote({
      noteType,
      id,
    })
    actions.notes.getNoteStats({
      notes: {
        [noteType]: {
          [id]: note
        }
      },
    })
  },
  onFieldUpdated({state, actions}) {
    actions.notes.checkFieldNotes()
    actions.notes.mapOadaToRecords()
  },
  // Return props.notes based on the change body contents
  notesFromChange({state}, props) {
    if (props.response.change.type === 'delete') return
    var body = props.response.change.body;
    var notes = {};
    return Promise.map(Object.keys(body || {}), (index) => {
      if (/^_/.test(index)) return
      return Promise.map(Object.keys(body[index] || {}), (id) => {
        if (/^_/.test(id)) return
        notes[index] = notes[index] || {};
        notes[index][id] = body[index][id];
        return
      })
    }).then(() => {
      return {notes}
    })
  },

  // Send note changes to the server
  oadaUpdateNote({actions, state}, props) {
    var note = _.cloneDeep(state.notes[props.noteType][props.id]);
    delete note['yield-stats'];
    state.oada.bookmarks.notes[props.noteType+'-index'][props.id] = note;
    return note
  },

  // Update stats in response to updates to yield tiles (attached to notes) that are
  // being watched. This must happen before mapOadaToRecords in order to find the 
  // old stats used before adding the new.
  async getYieldStats({state, actions}, props) {
    var connection_id = state.yield.connection_id;
    var body = props.response.change.body;
    var notes = {};
    var noteType = props.noteType;
    var id = props.id;
    // Exclude changes to stats key of yield-stats to avoid infinite loops
    if (body.stats) return
    var yieldStats = state.notes[noteType.replace(/\-index/, '')][id]['yield-stats'] || {};
    var stats = {};
    await Promise.map(Object.keys(body.geohashes || {}), async (geohash) => {
      await Promise.map(Object.keys(body.geohashes[geohash]['crop-index'] || {}), async (crop) => {
        if (yieldStats.geohashes[geohash] && yieldStats.geohashes[geohash]['crop-index'][crop].bucket) {
          if (yieldStats.geohashes[geohash].aggregates) {
            // Sub-bucket (aggregate) level geohashes used to calculate stats.
            await Promise.map(Object.keys(body.geohashes[geohash]['crop-index'][crop].bucket['geohash-data'] || {}), (aggregate) => {
              if (!yieldStats.geohashes[geohash].aggregates[aggregate]) return
              stats[crop] = stats[crop] || {};
              // Remove the current aggregate used in the stats calculation 
              // before adding the new aggregate
              console.log('BEFORE1 total data', aggregate, _.cloneDeep(yieldStats.stats[crop]));
              var oldGhData = yieldStats.geohashes[geohash]['crop-index'][crop].bucket['geohash-data'] || {};
              console.log('BEFORE1 existing aggregate (subtracting)', aggregate, oldGhData[aggregate]);
              stats[crop] = harvest.recomputeStats(yieldStats.stats[crop], oldGhData[aggregate], -1);
              console.log('MIDDLE1 sum after subtracting', aggregate, _.cloneDeep(stats[crop]));
              console.log('MIDDLE1 now adding aggregate', body, geohash, crop, aggregate, _.cloneDeep(body.geohashes[geohash]['crop-index'][crop].bucket['geohash-data'][aggregate]));
              if (props.response.change.type === 'delete') return
              stats[crop] = harvest.recomputeStats(stats[crop], body.geohashes[geohash]['crop-index'][crop].bucket['geohash-data'][aggregate]);
              console.log('AFTER1 total', aggregate, _.cloneDeep(stats[crop]));
              return
            })
          } else {
            // Bucket level geohashes used to calculate stats. Use the bucket.
            if (!yieldStats.geohashes) {
              if (props.response.change.type === 'delete') {
                return
              } else {
                stats[crop] = stats[crop] || {};
                stats[crop] = harvest.recomputeStats(yieldStats.stats[crop], body.geohashes[geohash]['crop-index'][crop].bucket.stats);
                console.log('BUCKET', stats[crop])
                return
              }
            } else {
              // Remove the current stats used in the stats calculation before
              // adding the new stats.
              console.log('BEFORE bucket', geohash, crop, _.cloneDeep(stats[crop]))
              stats[crop] = stats[crop] || {};
              stats[crop] = harvest.recomputeStats(yieldStats.stats[crop], yieldStats.geohashes[geohash]['crop-index'][crop].bucket.stats, -1);
              stats[crop] = harvest.recomputeStats(stats[crop], body.geohashes[geohash]['crop-index'][crop].bucket.stats);
              console.log('AFTER bucket', geohash, crop, _.cloneDeep(stats[crop]))
              return
            }
          }
        } else return
      })
    })

    if (stats && Object.keys(stats).length > 0) {
      notes[noteType] = notes[noteType] || {};
      notes[noteType][id] = notes[noteType][id] || {};
      notes[noteType][id].stats = stats;
    }

    let requests = Object.keys(notes || {})
      .forEach(noteType =>
        Object.keys(notes[noteType] || {})
        .forEach(id =>
          state.oada[connection_id].bookmarks.notes.[noteType][id].['yield-stats'] = {
            stats: notes[noteType][id].stats
          }
        )
      )
  },

  handleNoteListClick({state, actions}) {
    actions.notes.deselectNote();
    state.notes.editing = false;
  },
  editNoteButtonClicked({state, actions}, props) {
    state.notes.editing = true;
    state.notes.selectedNote = props.id;
	  state.notes.selectedNoteType = props.noteType;
    delete state.notes.noteDropdown.id;
    state.notes.noteDropdown.visible = false;
    actions.notes.toggleNoteDropdown();
  },
  sortingTabClicked({state}, {newSortMode}) {
    state.app.sortMode = newSortMode;
  },
  deleteNoteButtonClicked({state, actions}, props) {
    state.notes.noteDropdown.visible = false;
    delete state.notes.noteDropdown.id
    let note = state.notes[props.noteType][props.id];
    state.notes.editing = false;
    actions.notes.checkTags({id:props.id}); 
    delete state.notes.selectedNote
    delete state.notes[props.noteType][props.id]; // optimistic
    actions.notes.unwatchNote(props);
    let connection_id = state.notes.connection_id;
    delete state.oada[connection_id].bookmarks.notes[props.noteType][props.id];
  },
  noteTextChanged({state}, props) {
    let selected = state.notes.selectedNote;
    state.notes[selected.type][selected.id].text = props.value;
  },
  tagInputTextChanged({state, actions}, props) {
    delete state.notes[props.noteType][state.notes.selectedNote].tag_error;
    state.notes.tagText = props.value;
  },
  noteClicked({state, actions}, props) {
    if (!state.notes.editing) {
      actions.view.Map.fitGeometry(props);
//    actions.notes.mapToNotePolygon(props);
      state.notes.selectedNote = {
        id: props.id,
        type: props.type
      }
    }
  },
  setNoteStats({state}, {id, stats}) {
    Object.keys(stats).forEach((crop) => {
      state.notes.notes[id].stats = stats;
    })
    delete state.notes.notes[id].stats.computing;
  },
  undoButtonClicked({actions, state}, props) {
    let {type, id} = state.notes.selectedNote;
    let { geojson } = state.notes[type][id].boundary;
    if (geojson.coordinates[0] && geojson.coordinates[0].length > 1) {
      geojson.coordinates[0].pop();
    }
    let {area, bbox, centroid} = actions.view.Map.getGeometryABCs(geojson);
    state.notes[type][id].boundary = { area, bbox, centroid, geojson }
  },

  addNoteButtonClicked({state, actions}) {
    let noteType = state.notes.tab == 0 ? 'notes' : 'fields';
    let notes = state.notes[noteType];
    Object.values(notes).forEach(note => {
      state.notes[noteType][note.id].order = note.order +1;
    })

    let id = uuid();

    let note = {
      time: Date.now(),
      id,
      text: '',
      tags: [],
      fields: {},
      boundary: { 
        geojson: {
          "type":"Polygon",
          "coordinates": [[]],
        },
        bbox: {},
        centroid: [],
        area: 0.0,
      },
      color: rmc.getColor(),
      completions: [],
      stats: {},
      order: 0,
      visible: true,
    };
    note.font_color = getFontColor(note.color);
    state.notes[noteType][id] = note;
    state.notes.selectedNote = { id, type:noteType };
    state.notes.editing = true;
    
    //Now push to oada
    if (noteType === 'notes') {
      state.oada[state.notes.connection_id].bookmarks.notes[noteType+'-index'] = state.oada[state.notes.connection_id].bookmarks.notes[noteType+'-index'] || {};
      state.oada[state.notes.connection_id].bookmarks.notes[noteType+'-index'][id] = note;
    }
  },
  showHideButtonClicked({actions, effects, state}, {id}) {
  //ALTERNATIVELY TRY THIS
  //var boundaryVisible = state.get(`notes.${props`noteType`}.${props.id}.boundary`, 'visible');
    if (state.notes.note[id].visible) {
      state.notes.notes[id].visible = false;
    } else {
      state.notes.notes[id].visible = true;
    }
  },
  deselectNote({state}) {
    delete state.notes.selectedNote;
  },
  mapToNotePolygon({props, state}, {key}) {
    if (state.notes.notes[key] && state.notes.notes[key].geomtry) state.view.Map.center = state.notes.notes[key].boundary.centroid;
  },
  addTagToNote({state}, {text, id, noteType}) {
    let tags = state.notes.notes[id].tags;
    text = text.toLowerCase();
    if (text === '') {
      state.notes.tagError = 'Tag text required'
    } else if (tags.indexOf(text) > -1) {
      state.notes.tagError = 'Tag already applied';
    } else {
      let tags = state.notes.tags;
      let hash = md5(text)
      if (!tags[hash]) {
        state.notes.tags[hash] = {
          text,
          references: 1
        }
      } else {
        var noteTags = state.notes[noteType][id].tags;
        if (!noteTags[hash]) { // not already accounted for on 
          state.notes.tags[hash].references = tags[hash].references+1;
        }
        state.notes[noteType][id].tags[hash] = text;
      }

    }
  },

  addNoteToGeohashIndex({state}, props) {
    // Old code. No need???
//    geohashes.forEach((geohash) => {
 //     geohashNoteIndexManager.set(geohash, id);
//    })
//  },
  props.polygons.map(polygon => 
    Object.keys(polygon.geohashes || {})
      .map(gh => undefined
      //if (gh.length > 7) return 
      //geohashNoteIndexManager.set(gh, polygon.id);
      /*
      if (polygon) return oada.put({
        path: `/bookmarks/notes/${polygon.id}/yield-stats`,
        data: 
        connection_id: ''
      })
      */
      )
    )
  },
  //
  unwatchNote({actions, state, effects}, props) {
    return effects.oada.delete({
      path: `/bookmarks/notes/${props.noteType}-index/${props.id}`,
      unwatch: true,
      connection_id: state.notes.connection_id,
    }).then(() => {
      return effects.oada.delete({
        path: `/bookmarks/notes/${props.noteType}-index/${props.id}/yield-stats`,
        unwatch: true,
        connection_id: state.notes.connection_id,
      }).catch(() => {
        // Theres a chance no yield-stats were created initially if something goes wrong
        return
      })
    })
  },

  async getNoteGeohashes({state}, {id}) {
    let boundary = state.notes.notes[id].boundary;
    return yieldDataStatsForPolygon(boundary.geojson.coordinates[0], boundary.bbox).then((geohashes) => {
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
      return {geohashes, geohashPolygons};
    })
  },
  async computeNoteStats({state}, {geohashes}) {
    if (!state.app.OADAManager.connected) return {stats: {}}
    let token = state.app.OADAManager.token;
    let domain = state.app.OADAManager.domain;
    let stats = {};
    let availableGeohashes = state.yield.data_index;
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
      return Promise.map(geohashes, async (geohash) => {
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
      return {stats}
    })
  },
  checkTags ({state}, {id}) {
    var allTags = state.notes.tags;
    var noteTags = state.notes.notes[id].tags;
    noteTags.forEach((tag) => {
      if (allTags[tag].references <= 1) {
        delete state.notes.tags[tag]; 
      }
    })
  },
  deleteNote({state}, {id}) {
    delete state.notes.notes[id];
    var notes = state.notes.notes;
    Object.keys(notes).forEach((i) => {
      if (notes[i].order > id) {
        state.notes.notes[i].order--;
      }
    })
  },
  addTagToAllTagsList({state}, {text}) {
    var allTags = state.notes.tags;
    if (!allTags[text]) {
      state.notes.tags[text] = {
        text,
        references: 1
      };
    } else {
      state.notes.tags[text].references = allTags[text].references+1;
    }
  },
  removeTagFromAllTagsList({state}, {idx, tag}) {
    if (!state.notes.tags[tag].references) {
      delete state.notes.tags[tag];
    } else {
      state.notes.tags[tag].references = state.notes.tags[tag].references - 1;
    }
  },
  onMapClick({state, actions}, props) {
    actions.notes.dropPoint(props);
    let {type, id} = state.notes.selectedNote;
    let { geojson } = state.notes[type][id].boundary;
    let {area, bbox, centroid} = actions.view.Map.getGeometryABCs(geojson);
    state.notes[type][id].boundary = { area, bbox, centroid, geojson }
  },
  getTagsList({state}) {
    let tags = {};
    let notes = state.notes;
    return Promise.map(['fields', 'notes'], (noteType) => {
      return Promise.map(Object.keys(notes[noteType] || {}), (note) => {
        return Promise.map(Object.keys(notes[noteType][note].tags || {}), (key) => {
          tags[key] = tags[key] || {text: notes[noteType][note].tags[key], references: 0}
          tags[key].references++
          return
        })
      })
    }).then(() => {
      state.notes.tags = tags;
      return
    })
  },
  //TODO: This one could use an index of geohash -> notes perhaps...
  // As new geohash buckets enter our index, create links from these geohashes to
  // the relevant notes' yield-stats geohashes
  async handleYieldStatsGeohashes({actions, effects, state}, props) {
    var connection_id = state.yield.connection_id;
    var body = props.response.change.body;
    var notes = {};
    var stateNotes = state.notes
    return Promise.map(Object.keys(body['crop-index'] || {}), (crop) => {
      return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'] || {}), (ghLength) => {
        return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'] || {}), (geohash) => {
          // If that geohash belongs to a particular note, recalulate stats
          // If it hasn't been watched, setup the link(!!!) The watch is already established
          return Promise.map(['notes', 'fields'], (index) => {
            notes[index] = notes[index] || {};
            return Promise.map(Object.keys(stateNotes[index] || {}), (id) => {
              console.log(index,id)
              console.log(stateNotes[index])
              console.log(stateNotes[index][id])
              console.log(stateNotes[index][id]['yield-stats'])
              if (stateNotes[index][id]['yield-stats'] && stateNotes[index][id]['yield-stats'].geohashes[geohash]) {
                notes[index][id] = stateNotes[index][id];
                //              if (stateNotes[id]['yield-stats'].geohashes[geohash][crop] && !stateNotes[id]['yield-stats'].geohashes[geohash][crop]._id) {
                if (props.response.change.type === 'delete') {
                  return effects.oada.delete({
                    path: `/bookmarks/notes/${index}-index/${id}/yield-stats/geohashes/${geohash}/${crop}/bucket`,
                    connection_id,
                  })
                } else {
                  return effects.oada.put({
                    path: `/bookmarks/notes/${index}-index/${id}/yield-stats/geohashes/${geohash}/crop-index/${crop}/bucket`,
                    data: {
                      _id: body['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'][geohash]._id,
                      _rev: '0-0'
                    },
                    tree,
                    connection_id,
                  })
                }
              } else return
            })
          })
        })
      })
    }).then(() => {
      return {notes}
    })
  },
  getNoteComparisons({state}) {
    var notes = state.notes.notes;
    var fields = state.notes.fields;
    if (fields && notes) {
      return Promise.map(Object.keys(notes), (noteId) => {
        if (notes[noteId].boundary && notes[noteId].boundary.geojson && notes[noteId].boundary.geojson.coordinates && notes[noteId].boundary.geojson.coordinates[0] && notes[noteId].boundary.geojson.coordinates[0].length > 3) {
          return Promise.map(Object.keys(fields), (fieldId) => {
            if (polygonsIntersect(fields[fieldId].boundary.geojson.coordinates[0], notes[noteId].boundary.geojson.coordinates[0])) {
              if (fields[fieldId]['yield-stats'] && fields[fieldId]['yield-stats'].stats) {
                return Promise.map(Object.keys(fields[fieldId]['yield-stats'].stats), (crop) => {
                  if (notes[noteId]['yield-stats'].stats[crop]) {
                    var fieldStats = fields[fieldId]['yield-stats'].stats[crop];
                    var noteStats = notes[noteId]['yield-stats'].stats[crop];
                    var differenceMeans = fieldStats.yield.mean - noteStats.yield.mean;
                    var standardError = Math.pow((fieldStats.yield.variance/fieldStats.count) + (noteStats.yield.variance/noteStats.count), 0.5);
                    var zScore = Math.abs(differenceMeans)/standardError;
                    var pValue = zScore > 0 ? 2*(1 - dist.cdf(zScore)) : 2*(dist.cdf(zScore))
                    var comparison = {
                      differenceMeans,
                      standardError,
                      zScore,
                      pValue,
                      signficantDifference: pValue < 0.05
                    }
                    state.notes.fields[fieldId].notes[noteId][crop].comparison = comparison;
                    state.notes.notes[noteId].fields[fieldId][crop].comparison = comparison;
                    return
                  } else return
                })
              } else return
            } else return
          })
        } else return
      }).then((result) => {
        return
      }).catch((error) => {
        return
      })
    } else return
  },
  dropPoint({state, actions}, props) {
    let {type, id} = state.notes.selectedNote;
    let { latlng } = props;
    if (state.notes[type][id].boundary && state.notes[type][id].boundary.geojson) {
      state.notes[type][id].boundary.geojson.coordinates[0].push([latlng.lng, latlng.lat]);
    } else {
      state.notes[type][id].boundary.geojson = {
        type: "Polygon",
        coordinates: [[latlng.lng, latlng.lat]]
      }
    }
  },
}

function getFontColor(color) {
  var L = Color(color).luminosity();
  if (L > 0.179) {
    return '#000000';
  } else {
    return '#ffffff';
  }
}

// find distribution of geohash size and number of points
function getGeohashDistribution({state, props}) {
  var stuff = {
    'total-geohashes': 0,
    'total-count': 0,
    'geohash-1': 0,
    'geohash-2': 0,
    'geohash-3': 0,
    'geohash-4': 0,
    'geohash-5': 0,
    'geohash-6': 0,
    'geohash-7': 0,
    'geohash-8': 0,
    'geohash-9': 0,

  };
  return Promise.map(props.polygons || [], (obj) => {
    return Promise.map(Object.keys(obj.stats || {}), (key) => {
      stuff['total-count']+= obj.stats[key].count;
      return
    }).then(() => {
      if (Object.keys(obj.stats || {}).length === 0) return
      return Promise.map(Object.keys(obj.geohashes || {}), (bucket) => {
        return Promise.map(Object.keys(obj.geohashes[bucket].aggregates || {}), (aggregate) => {
          stuff['geohash-'+aggregate.length]++;
          stuff['total-geohashes']++;
          return
        })
      })
    })
  }).then(() => {
    return
  })
}
