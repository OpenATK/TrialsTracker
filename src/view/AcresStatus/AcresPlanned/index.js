import React from 'react';
import { Text, View } from 'react-native';

export default function AcresPlanned({acresStatus}) {
  return (
    <View style={{backgroundColor: '#c50003', paddingLeft: 7, paddingRight: 7, paddingTop: 5, paddingBottom: 5, borderRadius: 5}}>
      <Text style={{color: 'white', textShadowColor: '#000', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2}}>
        {`${acresStatus.planned} ac (${acresStatus.plannedPercentage}%)`}
      </Text>
    </View>
  );
}
