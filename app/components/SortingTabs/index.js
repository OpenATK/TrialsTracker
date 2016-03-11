import React, { PropTypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import styles from './sorting-tabs.css';

@Cerebral((props) => {
  return {
    sortMode: ['home', 'view', 'sort_mode'],
  };
})

class SortingTabs extends React.Component {

  static propTypes = {
  
  };

  render() {

    const signals = this.props.signals.home;

    return ( 
      <div className={styles['sorting-tabs']}>
      <button type="button" className={styles[this.props.sortMode==='all' ? 'selected-sorting-tab' : 'sorting-tab']} onClick={() => signals.sortingTabClicked({newSortMode: 'all'})}>
        All
      </button>
      <button type="button" className={styles[this.props.sortMode==='fields' ? 'selected-sorting-tab' : 'sorting-tab']} onClick={() => signals.sortingTabClicked({newSortMode: 'fields'})}>
        Fields
      </button>
      <button type="button" className={styles[this.props.sortMode==='tags' ? 'selected-sorting-tab' : 'sorting-tab']} onClick={() => signals.sortingTabClicked({newSortMode: 'tags'})}>
        Tags
      </button> 
      </div>
    );
  }
}
export default SortingTabs;
