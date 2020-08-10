import React from 'react';
import Toolbar from '@material-ui/core/Toolbar';
import Button from '@material-ui/core/Button';
import {TextInput, View} from 'react-native'

import overmind from '../../../overmind'

export default function DrawingToolbar() {
  const { actions } = overmind();
  const myActions = actions.view.TopBar;
  return (
    <Toolbar>
      <View style={{flex: 1}} />
      <Button color="inherit" onClick={() => myActions.onCancelField()}>Cancel</Button>
      <Button color="inherit" onClick={() => myActions.onSaveField()}>Save</Button>
    </Toolbar>
  );
}
