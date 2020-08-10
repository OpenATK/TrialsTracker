import React, { Component } from 'react';
import { Text, View } from 'react-native';

import AcresPlanned from './AcresPlanned'
import AcresStarted from './AcresStarted'
import AcresDone from './AcresDone'

import overmind from '../../overmind'

export default function AcresStatus() {
  const {state} = overmind();
  const acresStatus = state.app.acresStatus;
  const selectedOperationId = state.view.TopBar.OperationDropdown.selectedOperationId;
  if (!selectedOperationId) return null;
  return (
    //z-index of leaflet map is 400
    <View style={{position: "absolute", display: "flex", flexDirection: 'row', justifyContent: "center", alignItems: "center", top: 68, zIndex: 401, width: '100vw'}}>
      <AcresPlanned acresStatus={acresStatus} />
      <AcresStarted acresStatus={acresStatus} />
      <AcresDone acresStatus={acresStatus} />
    </View>
  );
}
