import { Controller } from 'cerebral';
import App from './modules/App'
import Map from './modules/Map'
import Note from './modules/Note'
import Connections from './modules/Connections'
import MenuBar from './modules/MenuBar'
import Fields from './modules/Fields'
import Yield from './modules/Yield'
import oada from './providers/oada'
import {devtoolsPort} from './config';

const Devtools = (
	process.env.NODE_ENV === 'production' ? null : require('cerebral/devtools').default)
var devPort = devtoolsPort;
if (process.env.NODE_ENV !== 'production') {
	devPort = (devtoolsPort+parseInt(window.location.port, 10)-3000);
	//	console.log('Cerebral DevTools running on port:', devPort)
}

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
	providers: [
		oada,
	],
	devtools: Devtools && Devtools({host:'localhost:8787'})//+devPort}),
})

export default controller
