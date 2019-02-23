import { Module } from 'cerebral'
import uuid from 'uuid'
import Color from 'color'

import * as signals from './sequences';

export default Module({

	state: {
		tab: 0,//0. notes, 1. fields, 2. tags
		loading: false, //true,
		visible: true,
    notes: {},//initial_notes(),
    note_dropdown: {
      visible: false
    },
    tags: {},
	},

	signals,
})

function initial_notes() { 
  let notes_list = {};
  for (let i = 1; i<3;i++) {
    let created = new Date(2015, 5, 17, 15);
    let note = {
      created,
      text: 'n-serve test',
      tags: [],//['application', 
      fields: {},
			color: '#ff5722',
			expanded: false,
      stats: {
        corn: { 
          area: {sum: 14.017808080808045, },
          weight: {sum: 3089.313640255855,},
          count: 5167,
					yield: {
						mean: 220.38492911637678, 
						standardDeviation: 32.55,
						variance: Math.pow(32.55, 2),
					},
					'sum-yield-squared-area': 46824,
        },
      },
      boundary: { 
        area: 12.439745214592033,
        geojson: {
         "type":"Polygon",
         "coordinates":[[
            [-86.18823766708374, 40.98551896940516],
            [-86.19110226631165, 40.98552706833876],
            [-86.1913275718689, 40.98535699052452],
            [-86.19170308113097, 40.985138318404545],
            [-86.19222879409789, 40.985178813296294],
            [-86.19241118431091, 40.98515451636424],
            [-86.19241118431091, 40.984895348531936],
            [-86.19245409965515, 40.98470097198927],
            [-86.19280815124512, 40.984514693931644],
            [-86.1928939819336, 40.98437700981173],
            [-86.19293689727783, 40.984182631741305],
            [-86.18823766708374, 40.9841988299357]
          ]]
        },
        bbox: {
          north: 40.98552706833876,
          south: 40.9841988299357,
          east: -86.18823766708374,
          west: -86.19293689727783,
        },
        centroid: [40.9848629491, -86.1905872822], 
        visible: true,
      },
      tags_modal_visibility: false,
    };
    if (i === 2) {
      let created = new Date(2015, 9, 22, 18);
      note = {
        text: 'rootworm damage',
        created,
        tags: ['low area'],
        color: '#607d8b',
			  expanded: false,
        stats: {
          corn: {
            area: {sum: 0.9599224747474746,},
            weight: {sum: 123.93012176598845,},
            count: 346,
						yield: { 
							mean: 129.1043027183946, 
							standardDeviation: 26.75,
							variance: Math.pow(26.75, 2),
						},
						'sum-yield-squared-area': 46824,
          },
        },
        fields: {},
        boundary: {
          area: 0.9776069561840566,
          geojson: {
            "type":"Polygon",
            "coordinates":[[
              [-86.20242118835448, 40.96346998610047],
              [-86.2027645111084, 40.96377784775565],
              [-86.20293617248535, 40.9637292381161],
              [-86.20330095291138, 40.963680628440756],
              [-86.20330095291138, 40.96338896963673],
              [-86.20340824127196, 40.9632107330664],
              [-86.20280742645264, 40.96311351291606]
            ]]
          },
          bbox: {
            north: 40.96377784775565,
            south: 40.96311351291606,
            east: -86.20242118835448,
            west: -86.20340824127196,
          },
          centroid: [40.963445,-86.2029147], 
          visible: true,
        },
        tags_modal_visibility: false,
      }
    }
    note.order = i;
    note.id = uuid.v4();
    notes_list[note.id] = note;
  }
  return notes_list;
}

function getFontColor(color) {
  let L = Color(color).luminosity();
  if (L > 0.179) {
    return '#000000';
  } else {
    return '#ffffff';
  }
}
