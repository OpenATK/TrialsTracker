import { Controller } from 'cerebral';
import Devtools from 'cerebral/devtools'

import App from './modules/App'
import Map from './modules/Map'
import Note from './modules/Note'
import Connections from './modules/Connections'
import MenuBar from './modules/MenuBar'
import Fields from './modules/Fields'
import Yield from './modules/Yield'

const controller = Controller({
  modules: {
    App,
    Map,
    Note,
    Connections,
		MenuBar,
		Fields,
		Yield,
  },

  devtools: Devtools({host:'localhost:8787'}),
})

export default controller
