import React, { PropTypes } from 'react'
import {connect} from 'cerebral-view-react'
import SortingTabs from '../SortingTabs/';
import Note from '../Note/'
import _ from 'lodash'
import uuid from 'uuid'
import styles from './note-list.css'

export default connect({
  notes: 'app.model.notes', 
  tags: 'app.model.tags',
  sortMode: 'app.view.sort_mode', 
  drawMode: 'app.view.draw_mode',
}, {
  handleClick: 'app.handleClick',
  noteListClicked: 'app.noteListClicked',
  addNoteButtonClicked: 'app.addNoteButtonClicked',
  noteRemoved: 'app.noteRemoved',
},

class NoteList extends React.Component {

  constructor(props) {
    super(props)
  }

  getNotes () {
    var notes_array = [];
    var self = this;
    switch (this.props.sortMode){
      case 'all':
//        Object.keys(self.props.notes).forEach(function(note) {
        _.each(self.props.notes, function (note) {
          notes_array.push(<Note id={note.id} key={uuid.v4()} deleteNote={() => this.props.noteRemoved()} />);  
        });
        break;

      case 'fields':
        var note_groups = _.groupBy(this.props.notes, 'fields');
        _.each(note_groups, function(group, key) {
          notes_array.push(<h1 key={uuid.v4()}>{key}</h1>);
          notes_array.push(<hr key={uuid.v4()}/>);
          _.each(group, function(note) {
            notes_array.push(<Note id={note.id} key={uuid.v4()} deleteNote={() => this.props.noteRemoved()} />);  
          });
        });
        break;

      case 'tags':
        // First, add notes without any tags.
        _.each(self.props.notes, function(note) {
        if (_.isEmpty(note.tags)) {
          notes_array.push(<Note id={note.id} key={uuid.v4()} deleteNote={() => this.props.noteRemoved()} />);  
        }
      });
      // Next, for each tag, show all notes with that tag.  Repetitions of the same note may occur.
      _.each(this.props.tags, function(tag) {
        notes_array.push(<span className='note-tag-headings' key={uuid.v4()}>{tag.text}</span>);
        notes_array.push(<hr key={uuid.v4()}/>);
        _.each(self.props.notes, function(note) {
          _.each(note.tags, function(noteTag) {
            if (noteTag === tag.text) {
              notes_array.push(<Note id={note.id} key={note.id} deleteNote={() => this.props.noteRemoved()} />);  
            }
          });
        });
      });  
      break;
    }
    return notes_array;
  }
  
  handleClick(evt) {
    // call only for note-list element, not children note elements;
    if (evt.target.className.substring(0, 9).indexOf('note-list') >= 0) {
      this.props.noteListClicked({});
    }
  }
  
  render() {
    var notes_array = this.getNotes();
    return (
      <div 
        className={styles['note-list']}>
        <SortingTabs />
        <div 
          className={styles['notes-container']}
          onClick={(evt) => {this.handleClick(evt)}}>
         {notes_array} 
        </div>
        <button 
          type="button" 
          disabled={this.props.drawMode}
          className={styles['add-note-button']} 
          onClick={() => {this.props.addNoteButtonClicked({drawMode:true})}}>
          Add Note
        </button>
      </div>
    );
  }
}
)
