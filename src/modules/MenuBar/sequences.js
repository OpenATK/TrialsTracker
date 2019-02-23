import { set, toggle } from 'cerebral/operators'
import {state} from 'cerebral/tags'

export var showMenuDropdown = [
  toggle(state`MenuBar.open`)
]

export var downloadNotes = [
  
]

export var toggleMapLegend = [
  toggle(state`view.legend.visible`)
]

export var connectionsClicked = [
  set(state`connections.open`, true),
]
