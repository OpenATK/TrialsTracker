import { Module } from 'cerebral'
import {
	initializeYield,
	dataReceived,
  addGeohashes,
  removeGeohashes,
} from './sequences'

export default Module({

	state : {
	},

	signals: {
		initialize: initializeYield,
		dataReceived,
    newTileDrawn: addGeohashes,
    tileUnloaded: removeGeohashes,
  }
})
