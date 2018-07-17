import stateTree from './stateTree.js';
import { Module } from 'cerebral';
import map from '../map'
import notes from '../notes'
import MenuBar from '../MenuBar'
import yieldModule from '../yield'
import oadaModule from '@oada/cerebral-module'
import oadaProvider from '@oada/cerebral-provider'
import oadaFields from '@oada/fields-module'
import * as signals from './sequences';

export default Module({

  modules: {
    map,
    notes,
    oada: oadaModule,
    yield: yieldModule,
    fields: oadaFields,
    MenuBar,
  },

  providers: {
		oada: oadaProvider,
	},

  state : stateTree,

	signals,

})
