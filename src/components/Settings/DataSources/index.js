import React from 'react';
import { connect } from 'cerebral/react';
import styles from './styles.css';

export default connect({
  yieldSource: 'app.view.settings.data_sources.yield.source',
  yieldOadaDomain: 'app.view.settings.data_sources.yield.oada_domain',
  fieldsSource: 'app.view.settings.data_sources.fields.source',
  fieldsOadaDomain: 'app.view.settings.data_sources.fields.oada_domain',
  visible: 'app.view.settings.data_sources.visible',
}, {
  submitClicked: 'app.dataSourcesSubmitClicked',
  cancelClicked: 'app.dataSourcesCancelClicked',
  fieldsSourceChanged: 'app.fieldsSourceButtonClicked',
  fieldsOadaDomainChanged: 'app.fieldsOadaDomainChanged',
  yieldSourceChanged: 'app.yieldSourceButtonClicked',
  yieldOadaDomainChanged: 'app.yieldOadaDomainChanged',
},

class DataSourceSettings extends React.Component {
  render() {
    return(
      <div className={styles[(this.props.visible) ? 'oada-domain-screen' : 'hidden']}>
        <div className={styles[(this.props.visible) ? 'oada-domain-modal' : 'hidden']}>
          <span 
            className={styles['title']}>
            Data Sources
          </span>
          <br />
          <span 
            className={styles['category-heading']}>
            Yield Data Source:
          </span>
          <form>
          <input
            type='radio'
            className={styles['radio-button']}
            checked={this.props.yieldSource === 'oada'}
            onChange={(e) => this.props.yieldSourceChanged({value:'oada'})}
            value="OADA"
            name="yield-data-source"
          />
          <span 
            className={styles['radio-button-text']}>
            OADA Server:
          </span>
          <input 
            type='text' 
            className={styles['text-input']}
            value={this.props.yieldOadaDomain} 
            onChange={(e) => this.props.yieldOadaDomainChanged({value: e.target.value})}
          />
          <br />
          <input
            type='radio'
            className={styles['radio-button']}
            checked={this.props.yieldSource === 'none'}
            onChange={(e) => this.props.yieldSourceChanged({value:'none'})}
            value="None"
            name="yield-data-source"
          />
          <span 
            className={styles['radio-button-text']}>
            None
          </span>
          </form>
          <span 
            className={styles['category-heading']}>
            Field Boundaries Source:
          </span>
          <form>
          <input
            type='radio'
            className={styles['radio-button']}
            checked={this.props.fieldsSource === 'oada'}
            onChange={(e) => this.props.fieldsSourceChanged({value:'oada'})}
            value="OADA"
            name="yield-data-source"
          />
          <span 
            className={styles['radio-button-text']}>
            OADA Server:
          </span>
          <input 
            type='text' 
            className={styles['text-input']}
            value={this.props.fieldsOadaDomain} 
            onChange={(e) => this.props.fieldsOadaDomainChanged({value: e.target.value})}
          />
          <br />
          <input
            type='radio'
            className={styles['radio-button']}
            checked={this.props.fieldsSource === 'data_silo'}
            onChange={(e) => this.props.fieldsSourceChanged({value:'data_silo'})}
            value="Data Silo"
            name="yield-data-source"
          />
          <span 
            className={styles['radio-button-text']}>
            Winfield Data Silo
          </span> 
          <br />
          <input
            type='radio'
            className={styles['radio-button']}
            checked={this.props.fieldsSource === 'none'}
            onChange={(e) => this.props.fieldsSourceChanged({value:'none'})}
            value="None"
            name="yield-data-source"
          />
          <span 
            className={styles['radio-button-text']}>
            None
          </span>
          </form>
          <br />
          <button 
            className={styles['submit-button']}
            type='button'
            onClick={() => this.props.submitClicked({})}>
            Submit
          </button>
          <button 
            className={styles['cancel-button']}
            type='button'
            onClick={() => this.props.cancelClicked({})}>
            Cancel
          </button>
        </div>
      </div>
    )
  }
})
