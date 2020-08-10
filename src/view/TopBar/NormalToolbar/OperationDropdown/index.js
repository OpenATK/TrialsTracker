import React from 'react'
import { Dropdown, Input } from 'semantic-ui-react'
import {View, Text} from 'react-native'
import _ from 'lodash'
/*const tagOptions = [
  {
    text: 'Important',
    value: 'Important',
    label: { color: 'red', empty: true, circular: true },
  }
]*/

import overmind from '../../../../overmind'

export default function OperationsDropdown({style}) {
  const { actions, state } = overmind();
  const myActions = actions.view.TopBar.OperationDropdown;
  const myState = state.view.TopBar.OperationDropdown;

  const selectedOperation = myState.selectedOperation;
  const operations = myState.list;
  const open = myState.open;
  const search = myState.search;
  const onAdd = myActions.onAdd;
  const onChange = myActions.onChange;
  const onOpenChange = myActions.onOpenChange;
  const onSearch = myActions.onSearch;

  return (
    <View style={style}>
      <View style={{flexDirection: 'row'}}>
        {
           selectedOperation ?
            <Dropdown
              open={open}
              onOpen={() => {onOpenChange({open: true})}}
              onBlur={() => {onOpenChange({open: false})}}
              text={selectedOperation.name}
              icon='cog'
              floating
              labeled
              button
              className='icon'
            >
              <Dropdown.Menu style={{top: 42}}>
                <Dropdown.Item style={{textAlign: 'center'}} text='Add New Operation' value='Add New Operation' onClick={(evt, data)=>{onAdd()}} />
                <Input icon='search' iconPosition='left' className='search' style={{marginTop: 3}} value={search} onChange={(evt)=>{onSearch({search: evt.target.value})}} />
                <Dropdown.Menu scrolling>
                  {_.map(operations, option => (
                    <Dropdown.Item key={option.value} {...option} onClick={(evt, data)=>{onChange({id: data.value})}} />
                  ))}
                </Dropdown.Menu>
              </Dropdown.Menu>
            </Dropdown>
          :
            <Dropdown
              onClick={() => {onAdd()}}
              open={false}
              text={'Add New Operation'}
              icon='cog'
              floating
              labeled
              button
              className='icon' />
        }
        <View style={{flex: 1}} />
      </View>
    </View>
  )
}
