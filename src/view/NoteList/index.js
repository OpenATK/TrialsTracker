import React from 'react'
import overmind from "../../overmind"
import Note from '../Note/'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
//import FieldNote from '../FieldNote/'
import Header from './Header'
import './styles.css'
import {Tabs, Tab, FloatingActionButton} from 'material-ui';
import SwipeableViews from 'react-swipeable-views';
import ContentAdd from 'material-ui/svg-icons/content/add';
import _ from 'lodash'


export default function NoteList() {
  const { actions, state } = overmind();
  const myActions = actions.notes;
  const myState = state.notes;
  const appState = state.app;

  let handleClick = function(evt) {
    // call only for note-list element, not children note elements;
    if (!myState.editing) {
      console.log(evt.target.className);
      if (evt.target.className.substring(0, 9).indexOf('note-list') >= 0) {
        myActions.noteListClicked({});
      }
    }
  }
 
  let notes = _.sortBy(_.values(myState.notes), 'order').map(note =>
    <Note 
      note={note} 
      id={note.id}
      key={note.id}
      type={'notes'}
    />
  );

  let fields = _.sortBy(_.values(myState.fields), 'order').map(note =>
    <Note 
      note={note} 
      id={note.id}
      key={note.id}
      type={'fields'}
    />
  );

  return (
    <MuiThemeProvider>
    <div 
      className={'note-list'}>
      <Header />
      <SwipeableViews
        index={appState.sortMode}
        onChangeIndex={(val) => myActions.sortingTabClicked({newSortMode: val})}>
        <div
          className={'notes-container'}
          onClick={(evt) => {handleClick(evt)}}>
          <div
            className={myState.editing ? 'hidden' : 'add-note'}
            onClick={(e) => myActions.addNoteButtonClicked({drawMode: true})}>
            Create a new note...
          </div>
          {notes} 
        </div>
        <div
          className={'notes-container'}>
          {fields} 
        </div>
        <div>
          TAG CARDS
        </div>
      </SwipeableViews>
      <FloatingActionButton
        className={'add-note-button'}
        style={(myState.editing && appState.sortMode === 0) ? {display: 'none'} : null}
        onClick={(e) => myActions.addNoteButtonClicked({drawMode: true})}>
        <ContentAdd />
      </FloatingActionButton>
    </div>
    </MuiThemeProvider>
  );
}
