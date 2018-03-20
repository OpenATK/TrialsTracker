import {
	initializeYield,
	dataReceived,
  addGeohashes,
  removeGeohashes,
} from './chains'

export default {

	state : {
	},

	signals: {
		initialize: initializeYield,
		dataReceived,
    newTileDrawn: addGeohashes,
    tileUnloaded: removeGeohashes,
  }
}
