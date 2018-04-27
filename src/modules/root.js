import App from './App'
import Map from './Map'
import Note from './Note'
import Connections from './Connections'
import MenuBar from './MenuBar'
import Fields from './Fields'
import Yield from './Yield'
import oada from '../providers/oada'
import { Module } from 'cerebral'

export default Module({

	modules: {
    App,
    Map,
    Note,
    Connections,
		MenuBar,
		Fields,
		Yield,
	},

	providers: {
		oada,
	},

})
