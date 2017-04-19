import { set, unset, copy, toggle } from 'cerebral/operators';

export var toggleMenuDropdown = [
  toggle(state`app.view.menu_dropdown_visible`)
]

export var downloadNotes = [
  
]

export var toggleMapLegend = [
  toggle(state`app.view.legend.visible`)
]
