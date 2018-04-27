import stateTree from './stateTree.js';
import { Module } from 'cerebral';
import Map from '../Map'
import notes from '../notes'
import Connections from '../Connections'
import MenuBar from '../MenuBar'
import fields from '../fields'
import Yield from '../Yield'
import oadaModule from '../oada'
import oada from '../../providers/oada'
import * as signals from './sequences';

export default Module({

	modules: {
    Map,
		notes,
		oada: oadaModule,
    Connections,
		MenuBar,
		fields,
		Yield,
	},

  state : stateTree,

  signals,

	providers: {
		oada,
	},
})
