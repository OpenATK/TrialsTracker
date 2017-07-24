import React from 'react'
import { connect } from 'cerebral/react'
import './styles.css'
import { state, signal } from 'cerebral/tags'
import { MenuItem, AppBar, IconButton, IconMenu, Divider } from 'material-ui'
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';

export default connect({
  dataIndex: state`app.model.yield_data_index`,
  currentLocation: state`app.model.current_location`,
  selectedNote: state`app.view.selected_note`,
  menuDropdownVisible: state`app.view.menu_dropdown_visible`,
  editing: state`app.view.editing`,
  isMobile: state`app.is_mobile`,
  notes: state`app.model.notes`,
  legendVisible: state`app.view.legend.visible`,

  dataSourcesButtonClicked: signal`app.dataSourcesButtonClicked`,
  clearCacheButtonClicked: signal`app.clearCacheButtonClicked`,
  gpsButtonClicked: signal`map.currentLocationButtonClicked`,
  backgroundClicked: signal`app.menuBackgroundClicked`,
  showMenuDropdown: signal`app.showMenuDropdown`,
  downloadNotes: signal`app.downloadNotesButtonClicked`,
  undoButtonClicked: signal`map.undoButtonClicked`,
  mapLegendButtonClicked: signal`app.mapLegendButtonClicked`,
},
class MenuBar extends React.Component {

  reqFS() {
    var el = document.documentElement,
      rfs = el.requestFullscreen
        || el.webkitRequestFullScreen
        || el.mozRequestFullScreen
        || el.msRequestFullscreen 
    ;
    rfs.call(el);
  }

  render() {
    let undoEnabled = this.props.selectedNote ?
      this.props.notes[this.props.selectedNote].geometry.geojson.coordinates[0].length > 0 : false;
    return (
      <AppBar
        className={'menu-bar'}
        title="TrialsTracker"
        showMenuIconButton={false}
        iconElementRight={<div>
          {Object.keys(this.props.dataIndex).length > 0 ? 
            <IconButton
              key={1}
              onTouchTap={() => this.props.mapLegendButtonClicked({})}
              iconClassName="material-icons">info
            </IconButton>
          : null }
          <IconButton
            key={2}
            style={this.props.currentLocation ? {} : {display:'none'}}
            onTouchTap={() => this.props.gpsButtonClicked({})}
            iconClassName="material-icons">gps_fixed
          </IconButton>
          <IconButton
            key={3}
            style={this.props.editing ? {} : {display:'none'}}
            disabled={!undoEnabled}
            onTouchTap={() => this.props.undoButtonClicked({})}
            iconClassName="material-icons">undo
          </IconButton>
          <IconMenu
            key={4}
            iconButtonElement={<IconButton><MoreVertIcon /></IconButton>}
            onRequestChange={()=>{this.props.showMenuDropdown()}}
            onItemTouchTap={()=>{this.props.showMenuDropdown()}}
            open={this.props.menuDropdownVisible}
            targetOrigin={{horizontal: 'right', vertical: 'top'}}
            anchorOrigin={{horizontal: 'right', vertical: 'top'}}>
              <MenuItem 
                primaryText="Clear Cache" 
                onTouchTap={()=>this.props.clearCacheButtonClicked({})}
              />
              <MenuItem
                style={this.props.isMobile ? {} : {display:'none'}}
                primaryText="Go Fullscreen"
                onTouchTap={()=>this.reqFS()}
              />
              <Divider />
              <MenuItem 
                primaryText="Edit Data Sources"
                onTouchTap={()=>this.props.dataSourcesButtonClicked({})}
              />
            </IconMenu>
          </div>
        }
      />
    )
  }
})
