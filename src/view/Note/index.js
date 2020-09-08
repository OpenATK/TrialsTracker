import React from 'react';
import overmind from "../../overmind";
import EditTagsBar from './editTagsBar.js';
import './note.css';
import Color from 'color'; 
import { IconMenu, MenuItem, CardHeader, TextField, IconButton, Divider, Card } from 'material-ui'
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';

export default function Note({note, id, type}) {
  const { actions, state } = overmind();
  const myState = state.notes;
  const myActions = actions.notes;
  const fieldActions = actions.view.FieldDetails;
  const selected = myState.selectedNote.id === note.id;

  const inputField = note.type === 'note' && selected && myState.editing ? input => {
    if (input) setTimeout(() => input.focus(), 100);
  } : null;
  let color = Color(note.color || '#000').alpha(0.4).rgb();

  let yields = [];
  if (note.stats && note.stats.computing) {
    yields.push(
      <span
        key={'yield-waiting-'+note.id}
        className={note.stats.computing ? 'blinker': 'hidden'}>
          {'Computing average yield...'}
      </span>
    )
  } else {
    Object.keys(note.stats || {}).forEach((crop) => {
      yields.push(
        <div
          key={note.id+'-yield-text-'+crop}
          className={'yield-text'}>
          <span
            key={note.id+'-yield-text-'+crop+'-header'}
            className={'yield-text-header'}>
              {crop.charAt(0).toUpperCase() + crop.slice(1) + ' Yield'}
           </span>
          <span
            key={note.id+'-yield-text-'+crop+'-value'}
            className={'yield-text-value'}>
              {note.stats[crop].yield.mean.toFixed(2) + ' bu/ac'}
          </span>
        </div>
      )
      yields.push(
        <br key={note.id + '-yieldsbreak-'+crop}/>
      );
    })
  }

  let areaContent = null;
  if (note.area) {
    areaContent = 
      <div
        key={'area'}
        className={'area'}>
        <span 
          className={'area-header'}>
          Area  <div
            style={{
              color: note.type === 'note' ? note.color : '#000',
              backgroundColor: note.type === 'note' ? `rgba(${color.r },${color.g},${color.b},${color.a})` : '#fff'}}
            className={'note-area-box'}
          />
        </span>
        <span 
          className={'area-value'}>
          {note.area.toFixed(2) + ' acres'}
        </span>
      </div>
  }

  let comps = [];
  (myState.comparisons || []).forEach((comp) => {
    Object.keys(comp.comparison).forEach((crop) => {
      let cropStr = crop.charAt(0).toUpperCase() + crop.slice(1);
      let sign = (comp.comparison[crop].comparison.differenceMeans < 0 ^ note.type === 'note') ? '-' : '+';
      comps.push(
        <div
          key={note.id+'-'+comp.text+'-'+crop+'-comparison'}
          className={'comparison'}>
          <div
            key={note.id+'-'+comp.text+'-'+crop}
            className={'comparison-header'}>
            <div
              className={'comparison-text'}
              key={note.id+'-'+comp.text+'-'+crop}>
              {comp.text}
            </div>
            {' ' + cropStr}
          </div>
          <span
            key={note.id+'-'+comp.text+'-'+crop+'-value'}
            className={'comparison-value'}>
            {comp.stats[crop].yield.mean.toFixed(2) +
            ' (' + sign + Math.abs(comp.comparison[crop].comparison.differenceMeans).toFixed(2) + ') bu/ac' }
          </span>
        </div>
      )
    })
  })

  return (
    <Card
      onClick={(e) => myActions.noteClicked({type, id:note.id})}
      className={'note'}
      style={{order: note.order ? myState.order : note.stats ? '0' : '1'}}>
      <CardHeader
        className={'note-header'}
        style={{
          padding: '0px 0px 0px 10px',
          backgroundColor: note.color || '#000', 
          color: note.type === 'field' ? '#fff' : '#000', 
          fontWeight: selected ? 'bold' : 'normal',
        }}
        textStyle={{padding: '0px'}}>
        <div className={'text'}>
        {myState.editing && selected ? <TextField
          multiLine={true}
          fullWidth={true}
          rows={1}
          rowsMax={3}
          className={'note-textfield'}
          textareaStyle={{
            lineHeight: '1.3em',
            maxHeight: '3.9em',
            margin: '0px',
          }}
          inputStyle={{display: 'flex'}}
          ref={inputField}
          value={note.text} 
          onChange={(e, value) => myActions.noteTextChanged({value, id:note.id})}
          tabIndex={1}
          hintText='Enter trial text here...'
          hintStyle={{bottom: '2px'}}
          underlineShow={false}
        /> 
        : 
        <div
          className={'note-text'}>
          {note.text}
        </div>
        }
      </div>
        <IconMenu
          menuStyle={{padding: '0px'}}
          iconButtonElement={
            <IconButton 
              style={{height:'25px', padding: '0px'}}
              onClick={(e)=>{myActions.toggleNoteDropdown({id:note.id});e.stopPropagation()}}>
              <MoreVertIcon />
            </IconButton>
          }
          open={myState.noteDropdown.visible && myState.noteDropdown.id === note.id}
          targetOrigin={{horizontal: 'right', vertical: 'top'}}
          anchorOrigin={{horizontal: 'right', vertical: 'top'}}>
          {selected && myState.editing ? null : <MenuItem 
            primaryText="Edit" 
            onClick={(e)=>{myActions.editNoteButtonClicked({type, id})}}
          /> }
          {selected && myState.editing ? null : <Divider /> }
          <MenuItem 
            primaryText="Delete"
            onClick={(e) => {myActions.deleteNoteButtonClicked({id:note.id})}}
          />
        </IconMenu>
      </CardHeader>
      <div
        className={note.area ? 'note-main-info' : 'hidden'}>
        {areaContent}
        {yields.length < 1 ? null : <br/>}
        {yields}
      </div>
      {comps.length ? <div
        className={'comparison-container'}>
        <div className={'comparisons-expander'}
          onClick={() => myActions.expandComparisonsClicked({path:note.path})}>
          <hr className={'comp-hr'}/>
          {note.expanded ? 'Yield Comparisons \u25bc' : 'Yield Comparisons \u25b6'}
          <hr className={'comp-hr'}/>
        </div>
        <div className={'comparisons'}>
          {note.expanded ? comps : null}
        </div>
      </div> : null }
      {(myState.editing && selected) || (note.tags && note.tags.length > 0) ? 
          <EditTagsBar note={note} selected={selected} id={note.id}/> : null }
    </Card>
  )
}
