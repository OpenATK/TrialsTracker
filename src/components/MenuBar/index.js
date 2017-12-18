import React from 'react'
import { connect } from '@cerebral/react'
import './styles.css'
import { state, signal } from 'cerebral/tags'
import { MenuItem, AppBar, IconButton, IconMenu, Divider } from 'material-ui'
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';

export default connect({
  dataIndex: state`Yield.data_index`,
  currentLocation: state`App.model.current_location`,
  selectedNote: state`Note.notes.${state`Note.selected_note`}`,
  open: state`MenuBar.open`,
  editing: state`App.view.editing`,
  isMobile: state`App.is_mobile`,
  legendVisible: state`App.view.legend.visible`,

  connectionsClicked: signal`MenuBar.connectionsClicked`,
  clearCacheButtonClicked: signal`MenuBar.clearCacheButtonClicked`,
  gpsButtonClicked: signal`Map.currentLocationButtonClicked`,
  backgroundClicked: signal`MenuBar.menuBackgroundClicked`,
  showMenuDropdown: signal`MenuBar.showMenuDropdown`,
  downloadNotes: signal`MenuBar.downloadNotesButtonClicked`,
  undoButtonClicked: signal`Map.undoButtonClicked`,
  mapLegendButtonClicked: signal`MenuBar.mapLegendButtonClicked`,
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
      this.props.selectedNote.geometry.geojson.coordinates[0].length > 0 : false;
    return (
      <AppBar
        className={'menu-bar'}
        title="TrialsTracker"
        showMenuIconButton={false}
        iconElementRight={<div>
          {Object.keys(this.props.dataIndex || {}).length > 0 ? 
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
                primaryText="Edit Source Data"
                onTouchTap={()=>this.props.connectionsClicked({})}
              />
              <MenuItem 
                primaryText="Sign Out"
                onTouchTap={()=>this.props.signOutClicked({})}
              />
            </IconMenu>
          </div>
        }
      />
    )
  }
})
