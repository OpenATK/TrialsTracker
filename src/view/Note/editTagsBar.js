import React from 'react';
import overmind from "../../overmind";
import './editTagsBar.css'
import { AutoComplete, Chip } from 'material-ui'

let labelStyle = {paddingLeft: '6px', paddingRight: '6px', lineHeight:'26px'}

export default function EditTagsBar({note}) {
  const { actions, state } = overmind();
  const myActions = actions.notes;
  const myState = state.notes;

  return (
    <div
      className={'edit-tags-bar'}>
        
      {note.selected && myState.editing ? note.tags.map((tag, idx) => 
        <Chip
          key={note.id + tag}
          labelStyle={labelStyle}
          style={{marginLeft: idx>0 ? '3px' : '0px'}}
          onRequestDelete={() => myActions.tagRemoved({idx})} 
          className={'tag'}>
          {tag}
        </Chip>) 
      : note.tags.map((tag, idx) => 
        <Chip
          key={note.id + tag} 
          labelStyle={labelStyle}
          style={{marginLeft: idx>0 ? '3px' : '0px'}}
          className={'tag'}>
          {tag}
        </Chip>) 
      }
      {myState.editing && note.selected ? <AutoComplete
        style={{height:'30px'}}
        underlineStyle={{bottom: '0px'}}
        textFieldStyle={{height:'30px'}}
        hintStyle={{bottom: '0px'}}
        errorStyle={{bottom: '17px'}}
        className={'input'}
        hintText={myState.error ? null : 'Add a new tag...'}
        errorText={myState.error ? myState.error : null}
        dataSource={Object.keys(myState.tags).filter(tag => tag.indexOf(myState.tagInputText) > -1)}
        onUpdateInput={(value) => myActions.tagInputTextChanged({value, noteId:note.id})}
        onNewRequest={(text, id) => myActions.tagAdded({text, noteId:note.id})}
        searchText={myState.tagInputText}
        onKeyDown={this.handleKeyDown}
        tabIndex={2}
      /> : null }
    </div>
  )
} 
