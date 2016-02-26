import React, { PropTypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import styles from './sorting-tabs.css';

class SortingTabs extends React.Component {

  static propTypes = {
  
  };

  render() {

    return ( 
      <div className={styles['sorting-tabs']}>
      <button type="button" className={styles['tab-button']}>
        All
      </button>
      <button type="button" className={styles['tab-button']}>
        Fields
      </button>
      <button type="button" className={styles['tab-button']}>
        Tags
      </button> 
      </div>
    );
  }
}
export default SortingTabs;
