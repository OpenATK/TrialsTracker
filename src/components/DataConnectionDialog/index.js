import React from 'react'
import { connect } from 'cerebral/react'
import { RadioButtonGroup, Subheader, Divider, RadioButton, TextField, RaisedButton } from 'material-ui'
import './datasource-settings.css'
import { state, signal } from 'cerebral/tags'

export default connect({
  yieldSource: state`app.view.settings.data_sources.yield.source`,
  yieldOadaDomain: state`app.view.settings.data_sources.yield.oada_domain`,
  fieldsSource: state`app.view.settings.data_sources.fields.source`,
  fieldsOadaDomain: state`app.view.settings.data_sources.fields.oada_domain`,
  visible: state`app.view.settings.data_sources.visible`,

  submitClicked: signal`app.dataSourcesSubmitClicked`,
  cancelClicked: signal`app.dataSourcesCancelClicked`,
  fieldsSourceChanged: signal`app.fieldsSourceButtonClicked`,
  fieldsOadaDomainChanged: signal`app.fieldsOadaDomainChanged`,
  yieldSourceChanged: signal`app.yieldSourceButtonClicked`,
  yieldOadaDomainChanged: signal`app.yieldOadaDomainChanged`,
},

class DataSourceSettings extends React.Component {

  doTheThing() {
    console.log('did it');
  }  

  render() {

    return(
      <div className={(this.props.visible) ? 'oada-domain-screen' : 'hidden'}>
        <div className={(this.props.visible) ? 'oada-domain-modal' : 'hidden'}>
          <span 
            className={'title'}>
            Data Sources
          </span>
          <Subheader>Yield Data:</Subheader>
          <RadioButtonGroup 
            name="yield-data-source" 
            onChange={(e,value) => {this.props.yieldSourceChanged({value})}}
            defaultSelected={this.props.yieldSource}>
            <RadioButton
              style={{width:'auto'}}
              label="OADA"
              value="oada"
              name="yield-data-source"
            />
            <RadioButton
              label="None"
              value="none"
              name="yield-data-source"
            />
          </RadioButtonGroup>
          <TextField
            value={this.props.yieldOadaDomain} 
            hintText="yield.oada-dev.com"
            disabled={this.props.yieldSource !== 'oada'} 
            onChange={(e) => this.props.yieldOadaDomainChanged({value: e.target.value})}
          />
          <Divider />
          <Subheader>Field Boundaries:</Subheader>
          <RadioButtonGroup 
            name="fields-data-source" 
            onChange={(e,value) => this.props.fieldsSourceChanged({value})}
            defaultSelected={this.props.fieldsSource}>
            <RadioButton
              style={{width:'auto'}}
              label="OADA"
              value="oada"
              name="fields-data-source"
            />
            <RadioButton
              label="Data Silo"
              value="data_silo"
              name="fields-data-source"
            />
            <RadioButton
              label="None"
              value="none"
              name="fields-data-source"
            />
          </RadioButtonGroup>
          <TextField
            hintText="yield.oada-dev.com"
            value={this.props.fieldsOadaDomain} 
            disabled={this.props.fieldsSource !== 'oada'} 
            onChange={(e) => this.props.fieldsOadaDomainChanged({value: e.target.value})}
          />
          <RaisedButton 
            className={'submit-button'}
            label="Submit" 
            primary={true}
            onClick={() => this.props.submitClicked({})}
          />
          <RaisedButton 
            className={'cancel-button'}
            label="Cancel" 
            secondary={true}
            onClick={() => this.props.cancelClicked({})}
          />
        </div>
      </div>
    )
  }
})
