import stateTree from './stateTree.js';
import { Module } from 'cerebral';
import StorageModule from '@cerebral/storage'
import livedemo from '../livedemo'
import map from '../map'
import notes from '../notes'
import MenuBar from '../MenuBar'
import yieldModule from '../yield'
import oadaModule from '@oada/cerebral-module'
import oadaProvider from '@oada/cerebral-provider'
import oadaFields from '@oada/fields-module'
import * as signals from './sequences';

const storage = StorageModule({
  target: localStorage,
  json: true,
  sync: {
    liveDemoIndex: 'livedemo.index'
  },
})

export default Module({

  modules: {
    oada: oadaModule,
    storage,
    map,
    livedemo,
    notes,
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
