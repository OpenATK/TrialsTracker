import { toggle } from 'cerebral/operators'
import {state} from 'cerebral/tags'

export var toggleMenuDropdown = [
  toggle(state`MenuBar.open`)
]

export var downloadNotes = [
  
]

export var toggleMapLegend = [
  toggle(state`view.legend.visible`)
]
