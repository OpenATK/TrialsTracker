import React, { PropTypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import SortingTabs from '../SortingTabs/';
import Note from '../Note/';
import _ from 'lodash';
import uuid from 'uuid';
import styles from './note-list.css';

@Cerebral((props) => {
  return {
    notes: ['home', 'model', 'notes'], 
    tags: ['home', 'model', 'tags'],
    sortMode: ['home', 'view', 'sort_mode'], 
  };
})

class NoteList extends React.Component {

  static propTypes = {
    sortMode : PropTypes.string,
  };

  getNotes () {
    var notes_array = [];
    var self = this;
    switch (this.props.sortMode){
      case 'all':
        _.each(self.props.notes, function (note) {
          notes_array.push(<Note id={note.id} key={uuid.v4()} deleteNote={() => signals.noteRemoved()} />);  
        });
        break;

      case 'fields':
        var note_groups = _.groupBy(this.props.notes, 'fields');
        _.each(note_groups, function(group, key) {
          notes_array.push(<h1 key={uuid.v4()}>{key}</h1>);
          notes_array.push(<hr key={uuid.v4()}/>);
          _.each(group, function(note) {
            notes_array.push(<Note id={note.id} key={uuid.v4()} deleteNote={() => signals.noteRemoved()} />);  
          });
        });
        break;

      case 'tags':
        // First, add notes without any tags.
        _.each(self.props.notes, function(note) {
        if (_.isEmpty(note.tags)) {
          notes_array.push(<Note id={note.id} key={uuid.v4()} deleteNote={() => signals.noteRemoved()} />);  
        }
      });
      // Next, for each tag, show all notes with that tag.  Repetitions of the same note may occur.
      _.each(this.props.tags, function(tag) {
        notes_array.push(<span className='note-tag-headings' key={uuid.v4()}>{tag.text}</span>);
        notes_array.push(<hr key={uuid.v4()}/>);
        _.each(self.props.notes, function(note) {
          _.each(note.tags, function(noteTag) {
            if (noteTag === tag.text) {
              notes_array.push(<Note id={note.id} key={note.id} deleteNote={() => signals.noteRemoved()} />);  
            }
          });
        });
      });  
      break;
    }
    return notes_array;
  }
  
  render() {
    var notes_array = this.getNotes();
    const signals = this.props.signals.home;

    return (
      <div className={styles['note-list']}>
        <SortingTabs />
        <div className={styles['notes-container']}>{notes_array} </div>
        <button 
          type="button" 
          className={styles['add-note-button']} 
          onClick={() => {signals.addNoteButtonClicked({drawMode:true})}}>
          Add Note
        </button>
      </div>
    );
  }
}

export default NoteList;
