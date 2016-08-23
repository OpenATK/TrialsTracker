import React, { PropTypes } from 'react';
import {connect} from 'cerebral-view-react'
import TextAreaAutoSize from 'react-textarea-autosize';
import EditTagsBar from './editTagsBar.js';
import uuid from 'uuid';
import styles from './note.css';
import fastyles from '../css/font-awesome.min.css';
import Color from 'color'; 
import FontAwesome from 'react-fontawesome';

export default connect(props => ({
  note: `app.model.notes.${props.id}`,
  text: `app.model.notes.${props.id}.text`,
  tags: `app.model.notes.${props.id}.tags`,
  selected: `app.model.notes.${props.id}.selected`,
  editing: 'app.view.editing_note',
  geometryVisible: `app.model.notes.${props.id}.geometry_visible`,
  drawMode: 'app.view.draw_mode',
}), {
  deleteNoteButtonClicked: 'app.deleteNoteButtonClicked',
  doneDrawingButtonClicked: 'app.doneDrawingButtonClicked',
  editNoteButtonClicked: 'app.editNoteButtonClicked',
  noteClicked: 'app.noteClicked',
  noteTextChanged: 'app.noteTextChanged',
},

  class Note extends React.Component {

    handleNoteClick(evt) {
//      if (evt.target.className.substring(0,5).indexOf('note') >= 0) {
      if (!this.props.selected) this.props.noteClicked({note:this.props.id})
//      }
    }
  
    render() {
      return (
        <div 
          style={{backgroundColor:this.props.note.color, borderColor:this.props.note.color}} 
          className={styles[this.props.selected ? 'selected-note' : 'note']} 
          onClick={(e) => this.handleNoteClick(e)}>
          <TextAreaAutoSize
            id={this.props.id+'-input'}
            value={this.props.text} 
            onChange={(e) => this.props.noteTextChanged({value: e.target.value, noteId:this.props.id})}
            style={{backgroundColor:this.props.note.color}} 
            minRows={1} 
            className={styles['note-text-input']} 
            tabIndex={1}
            placeholder='Type note description here'
          />
          <FontAwesome 
            name='pencil'
            size='2x'
            className={styles[this.props.selected && !this.props.editing ? 
              'edit-note-button' : 'hidden']}
            onClick={() => this.props.editNoteButtonClicked({})}
          />
          <FontAwesome 
            name='trash'
            size='2x'
            className={styles[this.props.selected && this.props.editing ? 
             'delete-note-button' : 'hidden']}
            onClick={() => this.props.deleteNoteButtonClicked({id:this.props.id})}
          />
          <hr noshade/>
          <div
            className={styles['note-info']}>
            {this.props.note.area ? 
              'Area: ' + this.props.note.area.toFixed(2) + ' acres' : null}
            <br/>
            {this.props.note.mean ? 
              'Yield: ' + this.props.note.mean.toFixed(2) + ' bu/ac' : null}
          </div>
          <FontAwesome 
            tabIndex={2}
            className={styles[this.props.selected && this.props.editing ?
              'done-drawing-button' : 'hidden']}
            name='check'
            size='2x'
            onClick={() => this.props.doneDrawingButtonClicked({drawMode:false, ids:[this.props.id]})}
          />
          <hr 
            noshade
            className={styles[this.props.editing && this.props.selected ? 
              'hr' : 'hidden']}
          />
          <EditTagsBar 
            id={this.props.id} 
          />
        </div>
      );
    }
  }
)
