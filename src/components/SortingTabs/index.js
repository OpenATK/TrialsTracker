import React, { PropTypes } from 'react';
import { connect } from 'cerebral-view-react';
import styles from './sorting-tabs.css';

export default connect(props => ({
  sortMode: 'app.view.sort_mode',
}), {
  sortingTabClicked: 'app.sortingTabClicked',
},

  class SortingTabs extends React.Component {

    constructor(props) {
      super(props);
    }

    render() {
  
      return ( 
        <div className={styles['sorting-tabs']}>
        <button 
          type="button" 
          className={styles[this.props.sortMode==='all' ? 
            'selected-sorting-tab' : 'sorting-tab']} 
          onClick={() => this.props.sortingTabClicked({newSortMode: 'all'})}>
          All
        </button>
        <button 
          type="button"
          disabled
          className={styles[this.props.sortMode==='fields' ? 
            'selected-sorting-tab' : 'sorting-tab']} 
          onClick={() => this.props.sortingTabClicked({newSortMode: 'fields'})}>
          Fields
        </button>
        <button 
          type="button" 
          disabled
          className={styles[this.props.sortMode==='tags' ? 
            'selected-sorting-tab' : 'sorting-tab']} 
          onClick={() => this.props.sortingTabClicked({newSortMode: 'tags'})}>
          Tags
        </button> 
        </div>
      );
    }
  }
)
