import React, {Component} from 'react';
import AppBar from '@material-ui/core/AppBar';
import {View} from 'react-native'

import DrawingToolbar from './DrawingToolbar';
import NormalToolbar from './NormalToolbar';

import overmind from '../../overmind'

export default function TopBar() {
  const {state} = overmind();
  const drawing = state.view.Map.BoundaryDrawing.drawing;
  return (
    <View style={{zIndex: 1201}}>
      <AppBar position="static">
        {
          drawing ? <DrawingToolbar /> : <NormalToolbar />
        }
      </AppBar>
    </View>
  );
}
