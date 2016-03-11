//var Note = require('../Note/note.js');
//var SortingTabs = require('../SortingTabs/sorting-tabs.js');
//var SearchBar = require('react-search-bar');
//var _ = require('lodash');
//var uuid = require('uuid');
//var branch = require('baobab-react/mixins').branch;
//var TagsModal = require('../TagsModal/tags-modal.js');
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
          console.log(notes_array);
          notes_array.push(<Note id={note.id} key={note.id} deleteNote={() => signals.noteRemoved()} />);  
        });
        break;

      case 'fields':
        var note_groups = _.groupBy(this.props.notes, 'fields');
        _.each(note_groups, function(group, key) {
          notes_array.push(<h1 key={uuid.v4()}>[key]</h1>);
          notes_array.push(<hr key={uuid.v4()}/>);
          for (var i in group) {
            notes_array.push(<Note id={group[i].id} key={group[i].id} deleteNote={() => signals.noteRemoved()} />);  
          }
        });
        break;

      case 'tags':
        _.each(self.state.notes, function(note) {
        if (_.isEmpty(note.tags)) {
          notes_array.push(<Note id={note.id} key={uuid.v4()} deleteNote={self.deleteNote} />);
        }
      });
      _.each(this.state.allTags, function(tag) {
        notes_array.push(<span className='note-tag-headings' key={uuid.v4()}>{tag}</span>);
        notes_array.push(<hr key={uuid.v4()}/>);
        _.each(self.state.notes, function(note) {
          _.each(note.tags, function(noteTag) {
            if (noteTag.text === tag) {
              notes_array.push(<Note id={note.id} key={uuid.v4()} deleteNote={self.deleteNote} />);
            }
          });
        });
      });  
      break;
    }
    console.log(notes_array);
    return notes_array;
  }
  
  render() {
    //var notes_array = this.getNotes();
    var notes_array = [];
    _.each(this.props.notes, function (note) {
          console.log(notes_array);
          notes_array.push(<Note id={note.id} key={note.id} deleteNote={() => signals.noteRemoved()} />);  
        });
    const signals = this.props.signals.home;
    
    return (
      <div className={styles['note-list']}>
        <SortingTabs />
        <div className={styles['notes-container']}>{notes_array} </div>
        <button type= "button" className={styles['add-note-button']} onClick={() => signals.noteAdded()}>
          Add Note
        </button>
      </div>
    );
  }
}

export default NoteList;
