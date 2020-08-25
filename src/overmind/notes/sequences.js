import { pop, equals, when, set, unset, toggle, wait } from 'cerebral/operators'
import { createMutationOperator, mutate, pipe, equals, when, set, unset, wait } from 'overmind';
import urlLib from 'url'
import polygonsIntersect from '../map/utils/polygonsIntersect';
import computeBoundingBox from '../map/utils/computeBoundingBox'
import gaussian from 'gaussian';
import gjArea from '@mapbox/geojson-area';
import { sequence } from 'cerebral'
import uuid from 'uuid';
import rmc from 'random-material-color';
import _ from 'lodash';
import Color from 'color';
import * as fields from '@oada/fields-module/sequences';
import * as yieldMod from '../yield/sequences.js';
import * as map from '../map/sequences.js';
import { state, props } from 'cerebral/tags'
import md5 from 'md5'
import oadaMod from '@oada/cerebral-module/sequences'
import harvest from '../yield/getHarvest'
import geohashNoteIndexManager from '../yield/utils/geohashNoteIndexManager'
const dist = require('gaussian')(0, 1);
const tree = require('./tree');
let B;

//TODO: after creating a new note, after stats are made, the stats weren't being
//mapped into notes.notes. changed fetchYieldStats to watchYieldStats.
//Also made mapOadaToRecords take props.notes or state.get oadaNotes




