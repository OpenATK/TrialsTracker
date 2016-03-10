import React, { PropTypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import styles from './sorting-tabs.css';

@Cerebral((props) => {
  return {
    
  };
})

class SortingTabs extends React.Component {

  static propTypes = {
  
  };

  render() {

    const signals = this.props.signals.home;

    return ( 
      <div className={styles['sorting-tabs']}>
      <button type="button" className={styles['tab-button']} onChange={() => signals.sortingTabClicked({newSortMode: 'all'})}>
        All
      </button>
      <button type="button" className={styles['tab-button']} onChange={() => signals.sortingTabClicked({newSortMode: 'fields'})}>
        Fields
      </button>
      <button type="button" className={styles['tab-button']} onChange={() => signals.sortingTabClicked({newSortMode: 'tags'})}>
        Tags
      </button> 
      </div>
    );
  }
}
export default SortingTabs;
