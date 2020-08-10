import React from 'react';
import {View, Text} from 'react-native'
import { Button, Modal, Input, Form } from 'semantic-ui-react'

import overmind from '../../overmind'

export default function NewOperation() {
  const {state, actions} = overmind();
  const myState = state.view.Modals.NewOperation;
  const myActions = actions.view.Modals.NewOperation;

  const { open, name } = myState;
  const { onNameChange, onCancel, onSave } = myActions;

  return (
    <Modal open={open} size='tiny'>
      <Modal.Header>New Operation</Modal.Header>
      <Modal.Content>
        <Text>Name:</Text>
        <View style={{flexDirection: 'row'}}>
          <Form style={{flex: 1}} onSubmit={onSave}>
            <Input autoFocus style={{width: '100%', marginTop: 7}} placeholder='Corn Planting' value={name} onChange={(evt) => {onNameChange({name: evt.target.value})}} />
          </Form>
        </View>
      </Modal.Content>
      <Modal.Actions>
        <Button negative onClick={() => onCancel()}>Cancel</Button>
        <Button positive icon='checkmark' labelPosition='right' content='Save' onClick={() => onSave()} />
      </Modal.Actions>
    </Modal>
  );
}
