import React, { PropTypes } from 'react';
import { connect } from 'cerebral/react';
import styles from './note-list-menu.css';
import FontAwesome from 'react-fontawesome';

export default connect(props => ({
  sortMode: 'app.view.sort_mode',
  editing: 'app.view.editing_note',
  selectedNote: 'app.view.selected_note',
}), {
  sortingTabClicked: 'app.sortingTabClicked',
  doneClicked: 'app.doneEditingButtonClicked',
  cancelClicked: 'app.cancelEditingButtonClicked',
},

  class NoteListMenu extends React.Component {

    render() {
      return ( 
        <div className={styles['sorting-tabs']}>
          <button 
            type="button" 
            tabIndex={2}
            className={styles[this.props.editing ? 'done-editing-button' : 'hidden']} 
            onClick={() => this.props.doneClicked({id:this.props.selectedNote})}>
            DONE 
          </button>
          <button 
            type="button" 
            className={styles[this.props.editing ? 'cancel-editing-button' : 'hidden']} 
            onClick={() => this.props.cancelClicked({id:this.props.selectedNote})}>
            CANCEL
          </button>
          <button 
            type="button" 
            className={styles[this.props.editing ? 'hidden' : 
              (this.props.sortMode==='all' ? 'selected-sorting-tab' : 'sorting-tab')]} 
            onClick={() => this.props.sortingTabClicked({newSortMode: 'all'})}>
            NOTES 
          </button>
          <button 
            type="button"
            className={styles[this.props.editing ? 'hidden' : 
              (this.props.sortMode==='fields' ? 'selected-sorting-tab' : 'sorting-tab')]} 
            onClick={() => this.props.sortingTabClicked({newSortMode: 'fields'})}>
            FIELDS
          </button>
          <button 
            type="button" 
            disabled={true}
            className={styles[this.props.editing ? 'hidden' :
              (this.props.sortMode==='tags' ? 'selected-sorting-tab' : 'sorting-tab')]} 
            onClick={() => this.props.sortingTabClicked({newSortMode: 'tags'})}>
            TAGS
          </button> 
          <FontAwesome
            name='search'
            className={styles[this.props.editing ? 'hidden' : 'search-button']}
            onClick={() => {}}
          />
        </div>
      );
    }
  }
)
