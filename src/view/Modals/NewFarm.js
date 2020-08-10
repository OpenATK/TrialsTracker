import React from 'react';
import {View, Text} from 'react-native'
import { Button, Modal, Input } from 'semantic-ui-react'

import overmind from '../../overmind'

export default function NewFarm() {
  const {state, actions} = overmind();
  const myState = state.view.Modals.NewFarm;
  const myActions = actions.view.Modals.NewFarm;

  const { open, name } = myState;
  const { onNameChange, onCancel, onSave } = myActions;

  return (
    <Modal open={open} size='tiny'>
      <Modal.Header>New Farm</Modal.Header>
      <Modal.Content>
        <Text>Name:</Text>
        <View style={{flexDirection: 'row'}}>
          <Input style={{flex: 1, marginTop: 7}} placeholder='Bowman Farms' value={name} onChange={(evt) => {onNameChange({name: evt.target.value})}} />
        </View>
      </Modal.Content>
      <Modal.Actions>
        <Button negative onClick={() => onCancel()}>Cancel</Button>
        <Button positive icon='checkmark' labelPosition='right' content='Save' onClick={() => onSave()} />
      </Modal.Actions>
    </Modal>
  );
}
