import React from 'react';
import overmind from "../../overmind";
import './editTagsBar.css'
import { AutoComplete, Chip } from 'material-ui'
import { Button, Icon } from 'semantic-ui-react';

let labelStyle = {paddingLeft: '6px', paddingRight: '6px', lineHeight:'26px'}

export default function EditTagsBar({selected, note}) {
  const { actions, state } = overmind();
  const myActions = actions.notes;
  const myState = state.notes;

  return (
    <div
      className={'edit-tags-bar'}>
        
      {selected && myState.editing ? note.tags.map((tag, idx) => 
        <Chip
          key={note.id + tag}
          labelStyle={labelStyle}
          style={{marginLeft: idx>0 ? '3px' : '0px'}}
          onRequestDelete={() => myActions.tagRemoved({idx, tag})} 
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
      <div className={"input-add"}>
        {myState.editing && selected ? <AutoComplete
          style={{height:'30px'}}
          underlineStyle={{bottom: '0px'}}
          textFieldStyle={{height:'30px'}}
          hintStyle={{bottom: '0px'}}
          errorStyle={{bottom: '17px'}}
          className={'input'}
          hintText={myState.error ? null : 'Tag this trial'}
          errorText={myState.error ? myState.error : null}
          dataSource={Object.keys(myState.tags).filter(tag => tag.indexOf(myState.tagInputText) > -1)}
          onUpdateInput={(value) => myActions.tagInputTextChanged({value, id:note.id})}
          onNewRequest={(text, id) => myActions.tagAdded({text, id:note.id})}
          searchText={myState.tagText}
          tabIndex={2}
        /> : null }
        {myState.editing && selected ? 
          <Button
            className={'add-tag-button'}
            onClick={(e) => myActions.tagAdded({id:note.id, text:myState.tagText})}
            icon>
            <Icon name='plus' />
          </Button> 
        : null }
      </div>
    </div>
  )
} 
