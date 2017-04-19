import React from 'react';
import { connect } from 'cerebral/react';
import './note-list-menu.css';
import FontAwesome from 'react-fontawesome';
import { state, signal } from 'cerebral/tags'

export default connect({
  sortMode: state`app.view.sort_mode`,
  editing: state`app.view.editing_note`,
  selectedNote: state`app.view.selected_note`,

  sortingTabClicked: signal`note.sortingTabClicked`,
  doneClicked: signal`note.doneEditingButtonClicked`,
  cancelClicked: signal`note.cancelEditingButtonClicked`,
},

  class NoteListMenu extends React.Component {

    render() {
      return ( 
        <div className={'sorting-tabs'}>
          <button 
            type="button" 
            tabIndex={2}
            className={this.props.editing ? 'done-editing-button' : 'hidden'} 
            onClick={() => this.props.doneClicked({id:this.props.selectedNote})}>
            DONE 
          </button>
          <button 
            type="button" 
            className={this.props.editing ? 'cancel-editing-button' : 'hidden'} 
            onClick={() => this.props.cancelClicked({id:this.props.selectedNote})}>
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
