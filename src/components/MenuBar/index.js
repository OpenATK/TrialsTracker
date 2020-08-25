import React from 'react'
import { connect } from '@cerebral/react'
import './styles.css'
import { state, signal } from 'cerebral/tags'
import { MenuItem, AppBar, IconButton, IconMenu, Divider } from 'material-ui'
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';

export default connect({
  index: state`yield.index`,
  currentLocation: state`map.current_location`,
  selected: state`notes.selected_note`,
  selectedNote: state`notes.notes.${state`notes.selected_note.id`}`,
  open: state`MenuBar.open`,
  editing: state`view.editing`,
  isMobile: state`view.is_mobile`,
  legendVisible: state`view.legend.visible`,
  connected: state`connections.connected`,

  connectionsClicked: signal`MenuBar.connectionsClicked`,
  signOutClicked: signal`connections.signOutClicked`,
  runLiveDataClicked: signal`yield.runLiveDataClicked`,
  clearCacheClicked: signal`clearCacheButtonClicked`,
  gpsClicked: signal`map.myLocationButtonClicked`,
  backgroundClicked: signal`MenuBar.menuBackgroundClicked`,
  showMenuDropdown: signal`MenuBar.showMenuDropdown`,
  downloadNotes: signal`MenuBar.downloadNotesButtonClicked`,
  undoClicked: signal`notes.undoButtonClicked`,
	mapLegendClicked: signal`MenuBar.mapLegendButtonClicked`,
  connectToDataSilo: signal`datasilo.connectToDataSilo`,
  addNoteClicked: signal`notes.addNoteButtonClicked`,
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
		let undoEnabled = this.props.selectedNote 
			&& this.props.selectedNote.boundary 
			&& this.props.selectedNote.boundary.geojson ?
			this.props.selectedNote.boundary.geojson.coordinates[0].length > 0 
      : false;

    return (
      <AppBar
        className={'menu-bar'}
        title="TrialsTracker"
        showMenuIconButton={false}
        iconElementRight={<div>
          {Object.keys(this.props.index || {}).length > 0 ? 
            <IconButton
              key={1}
              onClick={() => this.props.mapLegendClicked({})}
              iconClassName="material-icons">info
            </IconButton>
          : null }
          <IconButton
            key={0}
            style={this.props.isMobile && !this.props.editing ? {} : {display:'none'}}
            onClick={() => this.props.addNoteClicked({})}
            iconClassName="material-icons">note_add
          </IconButton>
          <IconButton
            key={2}
            style={this.props.currentLocation ? {} : {display:'none'}}
            onClick={() => this.props.gpsClicked({})}
            iconClassName="material-icons">gps_fixed
          </IconButton>
          <IconButton
            key={3}
            style={this.props.editing ? {} : {display:'none'}}
            disabled={!undoEnabled}
            onClick={() => this.props.undoClicked({id:this.props.selected.id, noteType:this.props.selected.type})}
            iconClassName="material-icons">undo
          </IconButton>
          <IconMenu
            key={4}
            iconButtonElement={<IconButton><MoreVertIcon /></IconButton>}
            onRequestChange={()=>{this.props.showMenuDropdown()}}
            onClick={()=>{this.props.showMenuDropdown()}}
            open={this.props.menuDropdownVisible}
            targetOrigin={{horizontal: 'right', vertical: 'top'}}
            anchorOrigin={{horizontal: 'right', vertical: 'top'}}>
              <MenuItem 
                primaryText="Clear Cache" 
                onClick={()=>this.props.clearCacheClicked({})}
              />
              <MenuItem
                style={this.props.isMobile ? {} : {display:'none'}}
                primaryText="Go Fullscreen"
                onClick={()=>this.reqFS()}
              />
              <Divider />
              {!this.props.connected ? <MenuItem 
                primaryText="Log in"
                onClick={()=>this.props.connectionsClicked({})}
              /> :
              <MenuItem 
                primaryText="Sign out"
                onClick={()=>this.props.signOutClicked({})}
              /> }
              <MenuItem 
                primaryText="Run Live Data"
                onClick={()=>this.props.runLiveDataClicked({})}
              />

            </IconMenu>
          </div>
        }
      />
    )
  }
})
