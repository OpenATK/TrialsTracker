import { toggle } from 'cerebral/operators'
import {state} from 'cerebral/tags'

export var toggleMenuDropdown = [
  toggle(state`app.view.menu_dropdown_visible`)
]

export var downloadNotes = [
  
]

export var toggleMapLegend = [
  toggle(state`app.view.legend.visible`)
]
