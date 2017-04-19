import React from 'react';
import { connect } from 'cerebral/react';
import './datasource-settings.css';
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
  render() {
    return(
      <div className={(this.props.visible) ? 'oada-domain-screen' : 'hidden'}>
        <div className={(this.props.visible) ? 'oada-domain-modal' : 'hidden'}>
          <span 
            className={'title'}>
            Data Sources
          </span>
          <br />
          <span 
            className={'category-heading'}>
            Yield Data Source:
          </span>
          <form>
          <input
            type='radio'
            className={'radio-button'}
            checked={this.props.yieldSource === 'oada'}
            onChange={(e) => this.props.yieldSourceChanged({value:'oada'})}
            value="OADA"
            name="yield-data-source"
          />
          <span 
            className={'radio-button-text'}>
            OADA Server:
          </span>
          <input 
            type='text' 
            className={'text-input'}
            value={this.props.yieldOadaDomain} 
            onChange={(e) => this.props.yieldOadaDomainChanged({value: e.target.value})}
          />
          <br />
          <input
            type='radio'
            className={'radio-button'}
            checked={this.props.yieldSource === 'none'}
            onChange={(e) => this.props.yieldSourceChanged({value:'none'})}
            value="None"
            name="yield-data-source"
          />
          <span 
            className={'radio-button-text'}>
            None
          </span>
          </form>
          <span 
            className={'category-heading'}>
            Field Boundaries Source:
          </span>
          <form>
          <input
            type='radio'
            className={'radio-button'}
            checked={this.props.fieldsSource === 'oada'}
            onChange={(e) => this.props.fieldsSourceChanged({value:'oada'})}
            value="OADA"
            name="yield-data-source"
          />
          <span 
            className={'radio-button-text'}>
            OADA Server:
          </span>
          <input 
            type='text' 
            className={'text-input'}
            value={this.props.fieldsOadaDomain} 
            onChange={(e) => this.props.fieldsOadaDomainChanged({value: e.target.value})}
          />
          <br />
          <input
            type='radio'
            className={'radio-button'}
            checked={this.props.fieldsSource === 'data_silo'}
            onChange={(e) => this.props.fieldsSourceChanged({value:'data_silo'})}
            value="Data Silo"
            name="yield-data-source"
          />
          <span 
            className={'radio-button-text'}>
            Winfield Data Silo
          </span> 
          <br />
          <input
            type='radio'
            className={'radio-button'}
            checked={this.props.fieldsSource === 'none'}
            onChange={(e) => this.props.fieldsSourceChanged({value:'none'})}
            value="None"
            name="yield-data-source"
          />
          <span 
            className={'radio-button-text'}>
            None
          </span>
          </form>
          <br />
          <button 
            className={'submit-button'}
            type='button'
            onClick={() => this.props.submitClicked({})}>
            Submit
          </button>
          <button 
            className={'cancel-button'}
            type='button'
            onClick={() => this.props.cancelClicked({})}>
            Cancel
          </button>
        </div>
      </div>
    )
  }
})
