import React from 'react';
import { Text, View } from 'react-native';

export default function AcresStarted({acresStatus}) {
  return (
    <View style={{backgroundColor: '#eeb705', paddingLeft: 7, paddingRight: 7, paddingTop: 5, paddingBottom: 5, borderRadius: 5, marginRight: 7, marginLeft: 7}}>
      <Text style={{color: 'white', textShadowColor: '#000', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2}}>
        {`${acresStatus.started} ac (${acresStatus.startedPercentage}%)`}
      </Text>
    </View>
  );
}
