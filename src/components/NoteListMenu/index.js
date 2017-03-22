import React, { PropTypes } from 'react';
import { connect } from 'cerebral-view-react';
import styles from './note-list-menu.css';
import FontAwesome from 'react-fontawesome';

export default connect(props => ({
  sortMode: 'app.view.sort_mode',
}), {
  sortingTabClicked: 'app.sortingTabClicked',
  addNoteButtonClicked: 'app.addNoteButtonClicked',
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
            ALL
          </button>
          <button 
            type="button"
            disabled={true}
            className={styles[this.props.sortMode==='fields' ? 
              'selected-sorting-tab' : 'sorting-tab']} 
            onClick={() => this.props.sortingTabClicked({newSortMode: 'fields'})}>
            FIELDS
          </button>
          <button 
            type="button" 
            disabled={true}
            className={styles[this.props.sortMode==='tags' ? 
              'selected-sorting-tab' : 'sorting-tab']} 
            onClick={() => this.props.sortingTabClicked({newSortMode: 'tags'})}>
            TAGS
          </button> 
          <FontAwesome
            name='search'
            className={styles['search-button']}
            onClick={() => {}}
          />
        </div>
      );
    }
  }
)
