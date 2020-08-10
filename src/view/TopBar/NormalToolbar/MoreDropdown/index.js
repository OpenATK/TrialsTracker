import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import MoreIcon from '@material-ui/icons/MoreHoriz';
import {View} from 'react-native'
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';

import overmind from '../../../../overmind'

export default function MoreDropdown({style}) {
  const { actions, state } = overmind();
  const myActions = actions.view.TopBar;

  const [anchorEl, setAnchorEl] = React.useState(null);
  function handleClick(event) {
    setAnchorEl(event.currentTarget);
  }
  function handleClose() {
    setAnchorEl(null);
  }
  return (
    <View style={style}>
      <IconButton edge="end" color="inherit" aria-label="Menu" onClick={handleClick}>
        <MoreIcon  />
      </IconButton>
      <Menu
        style={{top: 50, right: 5}}
        open={Boolean(anchorEl)}
        keepMounted
        anchorEl={anchorEl}
        onClose={handleClose}>
          <MenuItem onClick={()=>{handleClose(); myActions.onAddField()}}>Add Field</MenuItem>
          {
            !state.view.FieldDetails.open ? null :
            <MenuItem onClick={()=>{handleClose(); myActions.onEditField()}}>Edit Field</MenuItem>
          }
          <MenuItem onClick={()=>{handleClose(); myActions.onLogout()}}>Logout</MenuItem>
          {/*<MenuItem onClick={()=>{handleClose(); myActions.onResetCache()}}>Reset Cache</MenuItem>*/}
      </Menu>
    </View>
  );
}
