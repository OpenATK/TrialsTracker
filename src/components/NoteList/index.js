import React from 'react'
import {connect} from 'cerebral/react'
import Note from '../Note/'
import FieldNote from '../FieldNote/'
import './styles.css'
import {Tabs, Tab, FloatingActionButton} from 'material-ui';
import SwipeableViews from 'react-swipeable-views';
import {state, signal } from 'cerebral/tags'
import ContentAdd from 'material-ui/svg-icons/content/add';

export default connect({
  notes: state`app.model.notes`, 
  tags: state`app.model.tags`,
  sortMode: state`app.view.sort_mode`, 
  isMobile: state`app.is_mobile`,
  editing: state`app.view.editing`,
  selectedNote: state`app.view.selected_note`,
  fields: state`app.model.fields`,

  sortingTabClicked: signal`note.sortingTabClicked`,
  noteListClicked: signal`note.noteListClicked`,
  addNoteButtonClicked: signal`note.addNoteButtonClicked`,
  doneClicked: signal`note.doneEditingButtonClicked`,
},

class NoteList extends React.Component {

  handleClick(evt) {
    // call only for note-list element, not children note elements;
    if (!this.props.editing) {
      if (evt.target.className.substring(0, 9).indexOf('note-list') >= 0) {
        this.props.noteListClicked({});
      }
    }
  }

  render() {
    let notes_array = Object.keys(this.props.notes).map((key) => {
      return (<Note 
        id={key} 
        key={key}
      />)
    });

    let fields_array = Object.keys(this.props.fields).map((field) => {
      return(<FieldNote 
        id={field} 
        key={field}
      />)  
    })

    return (
      <div 
        className={'note-list'}>
        <button
          type="button"
          className={this.props.editing ? 'done-editing-button' : 'hidden'}
          onClick={() => this.props.doneClicked({id:this.props.selectedNote})}>
          DONE
        </button>
        <Tabs
          onChange={(val) => this.props.sortingTabClicked({newSortMode: val})}
          value={this.props.sortMode}>
          <Tab label="NOTES" value={0} />
          <Tab label="FIELDS" value={1} />
          <Tab label="TAGS" value={2} />
        </Tabs>
        <SwipeableViews
          index={this.props.sortMode}
          onChangeIndex={(val) => this.props.sortingTabClicked({newSortMode: val})}>
          <div
            className={'notes-container'}
            onTouchTap={(evt) => {this.handleClick(evt)}}>
            <div
              className={this.props.editing ? 'hidden' : 'add-note'}
              onTouchTap={(e) => this.props.addNoteButtonClicked({drawMode: true})}>
              Create a new note...
            </div>
            {notes_array} 
          </div>
          <div
            className={'notes-container'}>
            {fields_array} 
          </div>
          <div>
            TAG CARDS
          </div>
        </SwipeableViews>
        <FloatingActionButton
          className={'add-note-button'}
          style={(this.props.editing && this.props.sortMode === 0) ? {display: 'none'} : null}
          onTouchTap={(e) => this.props.addNoteButtonClicked({drawMode: true})}>
          <ContentAdd />
        </FloatingActionButton>
      </div>
    );
  }
})
