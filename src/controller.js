import { Controller } from 'cerebral';
import {devtoolsPort} from './config';
import App from './modules/App'
import oada from './providers/oada'


const Devtools = (
	process.env.NODE_ENV === 'production' ? null : require('cerebral/devtools').default)
var devPort = devtoolsPort;
if (process.env.NODE_ENV !== 'production') {
	devPort = (devtoolsPort+parseInt(window.location.port, 10)-3000);
	//	console.log('Cerebral DevTools running on port:', devPort)
}

const controller = Controller(App, {
	devtools: Devtools && Devtools({host:'localhost:8787'})//+devPort}),
})

export default controller
