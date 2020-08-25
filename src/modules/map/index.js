import { Module } from 'cerebral'
import * as signals from './sequences';

export default Module({

	state: {
		layers: {},
		//center: [40.739618459,-79.685532363],
		center: [40.98551896940516, -86.18823766708374],
		moving: false,
		geohashPolygons: [],
		zoom: 15,
		isLoading: false,
		dragging_marker: false,
		crop_layers: {},
	},
  
  signals,
})
