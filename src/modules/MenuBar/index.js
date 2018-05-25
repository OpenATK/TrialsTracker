import { Module } from 'cerebral'
import {
	showConnections,
	signOut,
} from '../Connections/chains'

import {
  toggleMenuDropdown,
  downloadNotes,
	toggleMapLegend,
} from './chains'


export default Module({
	state: {
    open: false
  },

  signals: {
    signOutClicked: signOut,
		connectionsClicked: showConnections,
    menuBackgroundClicked: toggleMenuDropdown,
    mapLegendButtonClicked: toggleMapLegend,
    showMenuDropdown: toggleMenuDropdown,
    downloadNotesButtonClicked: downloadNotes,
  }
})
