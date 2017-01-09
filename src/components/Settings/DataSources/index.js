import React from 'react';
import { connect } from 'cerebral-view-react';
import styles from './styles.css';

export default connect({
  text:'app.view.datasource_settings.oada_text',
  visible: 'app.view.datasource_settings.visible',
  boundaries: 'app.view.datasource_settings.field_boundary_source',
}, {
  textChanged: 'app.domainTextChanged',
  domainSubmitClicked: 'app.domainSubmitClicked',
  domainCancelClicked: 'app.domainCancelClicked',
  radioButtonClicked: 'app.fieldBoundarySourceButtonClicked',
},

class OadaDomainModal extends React.Component {
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
          <br />
          <span 
            className={styles['text-input-title']}>
            OADA Server Domain  
          </span>
          <input 
            type='text' 
            className={styles['text-input']}
            value={this.props.text} 
            onChange={(e) => this.props.textChanged({value: e.target.value})}
          />
          <br />
          <span 
            className={styles['category-heading']}>
            Field Boundaries Source:
          </span>
          <br />
          <input
            type='radio'
            className={styles['radio-button']}
            checked={this.props.boundaries === 'oada'}
            onChange={(e) => this.props.radioButtonClicked({value:'oada'})}
            value="OADA"
            name="yield-data-source"
          />
          <span 
            className={styles['radio-button-text']}>
            Use OADA Server from Above
          </span>
          <br />
          <input
            type='radio'
            className={styles['radio-button']}
            checked={this.props.boundaries === 'data_silo'}
            onChange={(e) => this.props.radioButtonClicked({value:'data_silo'})}
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
            checked={this.props.boundaries === 'none'}
            onChange={(e) => this.props.radioButtonClicked({value:'none'})}
            value="None"
            name="yield-data-source"
          />
          <span 
            className={styles['radio-button-text']}>
            None
          </span>
          <br />
          <button 
            className={styles['submit-button']}
            type='button'
            onClick={() => this.props.domainSubmitClicked({})}>
            Submit
          </button>
          <button 
            className={styles['cancel-button']}
            type='button'
            onClick={() => this.props.domainCancelClicked({})}>
            Cancel
          </button>
        </div>
      </div>
    )
  }
})
