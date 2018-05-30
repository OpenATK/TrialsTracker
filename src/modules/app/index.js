import stateTree from './stateTree.js';
import { Module } from 'cerebral';
import map from '../map'
import notes from '../notes'
import Connections from '../Connections'
import MenuBar from '../MenuBar'
import fields from '../fields'
import yieldModule from '../yield'
import oadaModule from '../oada'
import oada from '../../providers/oada'
import * as signals from './sequences';

export default Module({

	modules: {
		yield: yieldModule,
		fields,
    map,
		notes,
		oada: oadaModule,
    Connections,
		MenuBar,
	},

  state : stateTree,

	signals: {
		clearCacheButtonClicked: signals.clearCacheButtonClicked,
		init: signals.init,
	},

	providers: {
		oada,
	},
})
