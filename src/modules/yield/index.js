import { Module } from 'cerebral'
import {
	init,
	dataReceived,
  addGeohashes,
  removeGeohashes,
} from './sequences'

export default Module({

	state : {
	},

	signals: {
		init: init,
		dataReceived,
    newTileDrawn: addGeohashes,
		tileUnloaded: removeGeohashes,
  }
})
