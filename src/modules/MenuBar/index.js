import {
	showConnections,
	signOut,
} from '../Connections/chains'

import {
	clearCache,
} from '../App/chains'

import {
  toggleMenuDropdown,
  downloadNotes,
	toggleMapLegend,
} from './chains'


export default {
	state: {
    open: false
  },

  signals: {
    clearCacheButtonClicked: clearCache,
    signOutClicked: signOut,
		connectionsClicked: showConnections,
    menuBackgroundClicked: toggleMenuDropdown,
    mapLegendButtonClicked: toggleMapLegend,
    showMenuDropdown: toggleMenuDropdown,
    downloadNotesButtonClicked: downloadNotes,
  }
}
