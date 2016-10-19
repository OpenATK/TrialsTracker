import React from 'react';
import { connect } from 'cerebral-view-react';
import styles from './menu-bar.css';

export default connect({

}, {
  setDomainButtonClicked: 'app.setDomainButtonClicked',
  clearCacheButtonClicked: 'app.clearCacheButtonClicked',
},

class MenuBar extends React.Component {

  render() {
    return (
      <div className={styles['menu-bar']}>
        <button 
          type="button" 
          className={styles['clear-cache-button']}
          onClick={()=>this.props.clearCacheButtonClicked({})}>
          Clear Cache
        </button>
        <button 
          type="button" 
          className={styles['change-domain-button']}
          onClick={()=>this.props.setDomainButtonClicked({})}>
          Change Domain
        </button>
      </div>
    )
  }
})
