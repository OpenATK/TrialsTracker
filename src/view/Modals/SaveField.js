import React from 'react';
import {View, Text} from 'react-native'
import { Form, Button, Modal, Input, Dropdown, Icon } from 'semantic-ui-react'

import overmind from '../../overmind'

export default function SaveField() {
  const {state, actions} = overmind();
  const myState = state.view.Modals.SaveField;
  const myActions = actions.view.Modals.SaveField;

  const open = myState.open;
  const name = myState.name;
  const onNameChange = myActions.onNameChange;
  const onCancel = myActions.onCancel;
  const onSave = myActions.onSave;
  const [farmOpen, setFarmOpen] = React.useState(false);

  const farm = myState.farm || {};
  const farmOptions = myState.farms;

  return (
    <Modal open={myState.open} size='tiny'>
      <Modal.Header>
        {(state.view.Map.editingField) ? 'Edit Field' : 'New Field'}
      </Modal.Header>
      <Modal.Content>
        <View style={{flexDirection: 'column', zIndex: 1}}>
          <Text style={{marginBottom: 7}}>Field Name:</Text>
          <Form onSubmit={() => onSave()}>
            <Input autoFocus placeholder='Back 40' value={name} onChange={(evt) => {onNameChange({name: evt.target.value})}} />
          </Form>
          <Text style={{marginBottom: 7, marginTop: 15}}>Farm:</Text>
          <Dropdown
            trigger={
              <View style={{paddingLeft: 13, paddingRight: 7, border: '1px solid rgba(34,36,38,.15)', borderRadius: '.28571429rem', height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                <Text style={{color: (farm.name ? 'rgba(0,0,0,.87)' : 'rgba(0,0,0,.25)')}}>
                  {farm.name || 'Select a farm'}
                </Text>
                <Icon name='caret down' style={{paddingBottom: 17}}/>
              </View>
            }
            icon={null}
            onOpen={() => {setFarmOpen(true)}}
            onBlur={() => {setFarmOpen(false)}}
            open={farmOpen}>
            <Dropdown.Menu style={{overflow: 'hidden', maxHeight: '50vh'}}>
              <Dropdown.Item style={{textAlign: 'center'}} text='Add New Farm' value='Add New Farm' onClick={(evt, data)=>{myActions.onFarmAdd(); setFarmOpen(false);}} />
              <Input icon='search' iconPosition='left' className='search' value={myState.farmSearch} onChange={(evt)=>{myActions.onFarmSearchChange(evt.target.value)}} />
              <Dropdown.Menu scrolling>
                {farmOptions.map((option) => (
                  <Dropdown.Item key={option.value} {...option} onClick={() => {myActions.onFarmChange({id: option.value}); setFarmOpen(false);}} />
                ))}
              </Dropdown.Menu>
            </Dropdown.Menu>
          </Dropdown>
        </View>
      </Modal.Content>
      <Modal.Actions>
        <Button negative onClick={() => onCancel()}>Cancel</Button>
        <Button positive icon='checkmark' labelPosition='right' content='Save' onClick={() => onSave()} />
      </Modal.Actions>
    </Modal>
  );
}
