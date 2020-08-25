import { Module } from 'cerebral';
import StorageModule from '@cerebral/storage'
import oadaModule from '@oada/cerebral-module'
import oadaProvider from '@oada/cerebral-provider'
import * as signals from './sequences';
import { metadata, redirect } from '../../config'

const storage = StorageModule({
  target: localStorage,
  json: true,
  sync: {
    connections: 'connections'
  },
})

export default Module({

  modules: {
    oada: oadaModule,
    storage,
  },

  providers: {
		oada: oadaProvider,
	},

  state : {
    connected: false,
    connection: {
      domain: '',
    },
  },

	signals,

})
