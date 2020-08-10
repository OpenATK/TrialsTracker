import React from 'react';
import {View, Text} from 'react-native'
import { Button, Modal, Input } from 'semantic-ui-react'

import overmind from '../../overmind'

export default function OADADomain() {
  const {state, actions} = overmind();
  const myState = state.view.Modals.OADADomain;
  const myActions = actions.view.Modals.OADADomain;

  const { open, domain } = myState;
  const { onDomainChange, onCancel, onConnect } = myActions;

  return (
    <Modal open={open} size='tiny'>
      <Modal.Header>Connect to OADA Server</Modal.Header>
      <Modal.Content>
        <Text>Domain:</Text>
        <View style={{flexDirection: 'row'}}>
          <Input style={{flex: 1, marginTop: 7}} placeholder='https://oada.openatk.com' value={domain} onChange={(evt) => {onDomainChange({domain: evt.target.value})}} />
        </View>
      </Modal.Content>
      <Modal.Actions>
        <Button negative onClick={() => onCancel()}>Cancel</Button>
        <Button positive icon='checkmark' labelPosition='right' content='Connect' onClick={() => onConnect({})} />
      </Modal.Actions>
    </Modal>
  );
}
