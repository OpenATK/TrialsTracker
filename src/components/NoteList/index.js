import React from 'react'
import {connect} from 'cerebral/react'
import NoteListMenu from '../NoteListMenu/';
import Note from '../Note/'
import FieldNote from '../FieldNote/'
import _ from 'lodash'
import uuid from 'uuid'
import styles from './note-list.css'
import FontAwesome from 'react-fontawesome'

export default connect({
  notes: 'app.model.notes', 
  tags: 'app.model.tags',
  sortMode: 'app.view.sort_mode', 
  isMobile: 'app.is_mobile',
  editing: 'app.view.editing_note',
  selectedNote: 'app.view.selected_note',
  fields: 'app.model.fields',
}, {
  noteListClicked: 'app.noteListClicked',
  addNoteButtonClicked: 'app.addNoteButtonClicked',
  noteRemoved: 'app.noteRemoved',
},

class NoteList extends React.Component {

  getNotes () {
    var notes_array = [];
    var self = this;
    switch (this.props.sortMode){
      default: //'all'
        Object.keys(self.props.notes).forEach(function(key) {
          var note = self.props.notes[key];
          notes_array.push(<Note 
            id={note.id} 
            key={note.id}/>
          );
        });
        break;

      case 'fields':
        Object.keys(self.props.fields).forEach((field) => {
          notes_array.push(<FieldNote 
            id={field} 
            key={field} />
          )  
        })
        break;

      case 'tags':
        // First, add notes without any tags.
        _.each(self.props.notes, function(note) {
        if (_.isEmpty(note.tags)) {
          notes_array.push(<Note 
            id={note.id} 
            key={note.id} />
          );  
        }
      });
      // Next, for each tag, show all notes with that tag.  Repetitions of the same note may occur.
      _.each(this.props.tags, function(tag) {
        notes_array.push(<span className='note-tag-headings' key={uuid.v4()}>{tag.text}</span>);
        notes_array.push(<hr key={uuid.v4()}/>);
        _.each(self.props.notes, function(note) {
          _.each(note.tags, function(noteTag) {
            if (noteTag === tag.text) {
              notes_array.push(<Note 
                id={note.id} 
                key={note.id} 
              />);  
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
    if (!this.props.editing) {
      if (evt.target.className.substring(0, 9).indexOf('note-list') >= 0) {
        this.props.noteListClicked({});
      }
    }
  }

  

  render() {
    var notes_array = this.getNotes();

    return (
      <div 
        className={styles['note-list']}>
        <NoteListMenu />
        <div
          className={styles[this.props.editing ? 'hidden' : 'add-note']}
          onClick={(e) => this.props.addNoteButtonClicked({drawMode: true})}>
          Create a new note...
        </div>
        <div
          className={styles[this.props.editing ? 'hidden' : 'add-note-button']}
          onClick={(e) => this.props.addNoteButtonClicked({drawMode: true})}>
          <FontAwesome
            className={styles['add-note-button-icon']}
            name='plus'
          />
        </div>
        <div 
          className={styles['notes-container']}
          onClick={(evt) => {this.handleClick(evt)}}>
         {notes_array} 
        </div>
      </div>
    );
  }
})
