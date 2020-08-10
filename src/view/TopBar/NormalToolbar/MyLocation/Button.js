import React, {useEffect} from 'react'

import IconButton from '@material-ui/core/IconButton';
import MyLocation from '@material-ui/icons/MyLocation';
import {View} from 'react-native'

import _ from 'lodash'
import overmind from '../../../../overmind'

export default function Button({coords, isGeolocationAvailable, isGeolocationEnabled}) {
  const { actions } = overmind();
  const myActions = actions.view.TopBar;

  useEffect(() => {
    myActions.onLocationChange(coords);
  });

  return (
    <View>
      <IconButton edge="end" color="inherit" aria-label="Menu" onClick={()=>{myActions.onMyLocationClick(coords)}}>
        <MyLocation  />
      </IconButton>
    </View>
  )
}
