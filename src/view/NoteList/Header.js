import React from "react";
import overmind from "../../overmind";
import './styles.css'
import {Tabs, Tab} from 'material-ui';

export default function Header() {
  const { actions, state } = overmind();
  const myState = state.notes;
  const myActions = actions.notes;
  const fieldActions = actions.app.Fields;

  let handleClick = function (evt) {
    // call only for note-list element, not children note elements;
    if (!myState.editing) {
      if (evt.target.className.substring(0, 9).indexOf('note-list') >= 0) {
        myActions.noteListClicked({});
      }
    }
  }

  return (
    <div 
      className={'note-list-header'}>
      {myState.editing ? 
      <Tabs
        onTouchTap={() => myActions.doneClicked({id:myState.selectedNote})}
        value={0}>
        <Tab 
          label="DONE" 
          tabIndex={3}
          value={0} 
        />
      </Tabs>
      :
      <Tabs
        onChange={(val) => myActions.sortingTabClicked({newSortMode: val})}
        value={state.app.sortMode}>
        <Tab label="NOTES" value={0} />
        <Tab label="FIELDS" value={1} />
        <Tab label="TAGS" value={2} />
      </Tabs>
      }
    </div>
  )
}
