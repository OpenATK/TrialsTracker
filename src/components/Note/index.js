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
      if (!this.props.drawMode) {
        if (!this.props.selected) this.props.noteClicked({note:this.props.id})
      }
    }
    
    validatePolygon() {
      if (this.props.note.geometry.coordinates[0].length > 3) {
        if (this.props.note.text !== '') {
          this.props.doneDrawingButtonClicked({drawMode:false, id:this.props.id})
        }
      }
    }

    validateComplete() {

    }
  
    render() {
      return (
        <div 
          style={{backgroundColor:this.props.note.color, borderColor:this.props.note.color, color:this.props.note.font_color}} 
          className={styles[this.props.selected ? 'selected-note' : 'note']} 
          onClick={(e) => this.handleNoteClick(e)}>
          <div
            className={styles['note-upper']}>
            <TextAreaAutoSize
              className={styles['note-text-input']}
              id={this.props.id+'-input'}
              value={this.props.text} 
              onChange={(e) => this.props.noteTextChanged({value: e.target.value, noteId:this.props.id})}
              style={{backgroundColor:this.props.note.color, color:this.props.note.font_color}} 
              minRows={1} 
              tabIndex={1}
              placeholder='Type note description here'
              readOnly={this.props.editing ? false : "readonly"}
            />
            <FontAwesome 
              name='pencil'
              size='lg'
              className={styles[this.props.selected && !this.props.editing ? 
                'edit-note-button' : 'hidden']}
              onClick={() => this.props.editNoteButtonClicked({})}
            />
            <FontAwesome 
              name='trash'
              size='2x'
              className={styles[this.props.selected && this.props.editing ? 
               'delete-note-button' : 'hidden']}
              onClick={() => this.props.deleteNoteButtonClicked({id:this.props.id, drawMode: false})}
            />
          </div>
          <div
            className={styles[this.props.note.area ?
              'note-middle' : 'hidden']}>
            <hr 
              className={styles['hr']}
              style={{backgroundColor:this.props.note.font_color}} 
              noshade
            />
            {this.props.note.area ? 
              'Area: ' + this.props.note.area.toFixed(2) + ' acres' : null}
            <br/>
            {this.props.note.stats.corn ? 
              'Yield: ' + this.props.note.stats.corn.mean_yield.toFixed(2) + ' bu/ac' : null}
          </div>
          <div
            className={styles['note-lower']}>
            <hr 
              noshade
              style={{backgroundColor:this.props.note.font_color}} 
              className={styles[this.props.editing && this.props.selected ? 
                'hr' : 'hidden']}
            />
            <EditTagsBar 
              id={this.props.id} 
            />
            <FontAwesome 
              tabIndex={2}
              className={styles[this.props.selected && this.props.editing ?
                'done-editing-button' : 'hidden']}
              name='check'
              size='2x'
              onClick={() => this.validatePolygon()}
            />
          </div>
        </div>
      );
    }
  }
)
