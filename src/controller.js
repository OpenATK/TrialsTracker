import { Controller } from 'cerebral';
import Devtools from 'cerebral/devtools'

import app from './modules/app'
import map from './modules/Map'
import note from './modules/Note'

const controller = Controller({
  modules: {
    app,
    map,
    note,
  },

  devtools: Devtools({remoteDebugger:'localhost:8787'}),
})

export default controller
