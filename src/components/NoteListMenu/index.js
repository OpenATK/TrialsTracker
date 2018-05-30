import React from 'react';
import { connect } from '@cerebral/react';
import './styles.css';
import FontAwesome from 'react-fontawesome';
import { state, signal } from 'cerebral/tags'

export default connect({
  sortMode: state`app.view.sort_mode`,
  editing: state`app.view.editing`,
  selectedNote: state`notes.selected_note`,

  sortingTabClicked: signal`notes.sortingTabClicked`,
  doneClicked: signal`notes.doneClicked`,
  cancelClicked: signal`notes.cancelEditingButtonClicked`,
},

  class NoteListMenu extends React.Component {

    render() {
      return ( 
        <div className={'sorting-tabs'}>
          <button 
            type="button" 
            tabIndex={2}
            className={this.props.editing ? 'done-editing-button' : 'hidden'} 
            onClick={() => this.props.doneClicked({id:this.props.selectedNote.id, type: this.props.selectedNote.type})}>
            DONE 
          </button>
          <button 
            type="button" 
            className={this.props.editing ? 'cancel-editing-button' : 'hidden'} 
            onClick={() => this.props.cancelClicked({id:this.props.selectedNote.id, type: this.props.selectedNote.type})}>
            CANCEL
          </button>
          <button 
            type="button" 
            className={this.props.editing ? 'hidden' : 
              (this.props.sortMode==='all' ? 'selected-sorting-tab' : 'sorting-tab')} 
            onClick={() => this.props.sortingTabClicked({newSortMode: 'all'})}>
            NOTES 
          </button>
          <button 
            type="button"
            className={this.props.editing ? 'hidden' : 
              (this.props.sortMode==='fields' ? 'selected-sorting-tab' : 'sorting-tab')} 
            onClick={() => this.props.sortingTabClicked({newSortMode: 'fields'})}>
            FIELDS
          </button>
          <button 
            type="button" 
            disabled={true}
            className={this.props.editing ? 'hidden' :
              (this.props.sortMode==='tags' ? 'selected-sorting-tab' : 'sorting-tab')} 
            onClick={() => this.props.sortingTabClicked({newSortMode: 'tags'})}>
            TAGS
          </button> 
          <FontAwesome
            name='search'
            className={this.props.editing ? 'hidden' : 'search-button'}
            onClick={() => {}}
          />
        </div>
      );
    }
  }
)
