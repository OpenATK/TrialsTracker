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
require("./note-list.css");

@Cerebral({
  notes: ['home', 'model', 'notes'], 
})

class NoteList extends React.Component {

  static propTypes = {
    notes : PropTypes.arrayOf(PropTypes.instanceOf(Note)),
  };

  render() {

    var notes_array = [];
    var self = this;
    _.each(this.props.notes, function (note) {
      notes_array.push(<Note id={note.id} key={note.id} deleteNote={() => signals.noteRemoved()} />);  
    });

    const signals = this.props.signals.home;

    return (
      <div className="note-list">
        <SortingTabs />
        <div className="notes-container">{notes_array} </div>
        <button type= "button" className="add-note-button" onClick={() => signals.noteAdded()}>
          Add Note
        </button>
      </div>
    );
  }
}

export default NoteList;
