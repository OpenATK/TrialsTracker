import React from 'react';
import Drawer from '@material-ui/core/Drawer';
import Checkbox from '@material-ui/core/Checkbox';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';
import {View, Text} from 'react-native';
import IconButton from '@material-ui/core/IconButton';
import EditIcon from '@material-ui/icons/Edit';
import _ from 'lodash';
import { Button } from 'semantic-ui-react'


import overmind from '../../overmind'

export default function FieldDetails() {
  const {state, actions} = overmind();
  const myState = state.view.FieldDetails;
  const myActions = actions.view.FieldDetails;

  let { open, field, farm, showAddOperationButton } = myState;
  const { onStatusChange, onEditFieldClick, onAddNewOperationClick } = myActions;

  if (!Boolean(field)) {
    open = false;
    field = {};
  }
  return (
    <Drawer anchor="bottom" open={open} variant="persistent">
      <View style={{paddingBottom: 20}}>
        <View style={{flexDirection: 'column', alignItems: 'center'}}>
          <View style={{justifyContent: 'left', flexDirection: 'row', alignItems: 'center', marginTop: 10}}>
              <Text style={{fontWeight: 'bold', fontSize: 20}}>
                {field.name}
              </Text>
              <Text style={{marginLeft: 7, fontSize: 18}}>
                {`- ${Math.round(field.acres)} ac`}
              </Text>
          </View>
          {
            farm == null ? null :
            <Text style={{fontSize: 15, color: '#999', marginTop: 2, marginBottom: 7}}>
              {farm.name}
            </Text>
          }
        </View>
        <View style={{justifyContent: 'center', flexDirection: 'row'}}>
          {
            showAddOperationButton ?
              <Button style={{marginTop: 15}} onClick={() => myActions.onAddNewOperationClick()}>Add New Operation</Button>
            :
            <FormControl component="fieldset">
              <FormGroup aria-label="position" name="position" row>
                <FormControlLabel
                  value="bottom"
                  control={<Checkbox color="primary" checked={(field.status == "planned") || false} onChange={()=>{onStatusChange({status: 'planned'})}} />}
                  label="Planned"
                  labelPlacement="bottom"
                />
                <FormControlLabel
                  value="bottom"
                  control={<Checkbox color="primary" checked={(field.status == "started") || false} onChange={()=>{onStatusChange({status: 'started'})}} />}
                  label="Started"
                  labelPlacement="bottom"
                />
                <FormControlLabel
                  value="bottom"
                  control={<Checkbox color="primary" checked={(field.status == "done") || false} onChange={()=>{onStatusChange({status: 'done'})}} />}
                  label="Done"
                  labelPlacement="bottom"
                />
              </FormGroup>
            </FormControl>
          }
        </View>
      </View>
    </Drawer>
  );
}
