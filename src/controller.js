import { Controller } from 'cerebral';
import Devtools from 'cerebral/devtools'

import App from './modules/App'
import map from './modules/Map'
import note from './modules/Note'
import Connections from './modules/Connections'
import MenuBar from './modules/MenuBar'

const controller = Controller({
  modules: {
    App,
    map,
    note,
    Connections,
    MenuBar,
  },

  devtools: Devtools({host:'localhost:8787'}),
})

export default controller
