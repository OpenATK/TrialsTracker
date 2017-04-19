import React, { PropTypes } from 'react';
import {connect} from 'cerebral/react'
import TextAreaAutoSize from 'react-textarea-autosize';
import EditTagsBar from './editTagsBar.js';
import uuid from 'uuid';
import styles from './new-note-screen.css';
import Color from 'color'; 
import FontAwesome from 'react-fontawesome';

export default connect(props => ({
  note: `app.model.notes.${props.id}`,
  text: `app.model.notes.${props.id}.text`,
  tags: `app.model.notes.${props.id}.tags`,
  selected: `app.model.notes.${props.id}.selected`,
  editingNote: 'app.view.editing_note',
}), {
  deleteNoteButtonClicked: 'app.deleteNoteButtonClicked',
  doneDrawingButtonClicked: 'app.doneDrawingButtonClicked',
  noteTextChanged: 'app.noteTextChanged',
  backgroundClicked: 'app.noteBackgroundClicked',
  newNoteCancelled: 'app.newNoteCancelled',
},

  class NewNoteScreen extends React.Component {

    render() {
      var editing = this.props.editingNote ?
        (this.props.selected ? true:false) : false
      if (!this.props.note) return null;

      var area = null;
      var areaContent = null;
      if (this.props.note.area) {
        area = 'Area: ' + this.props.note.area.toFixed(2) + ' acres';
        areaContent = 
          <div
            key={'area'}
            className={styles['area']}>
            <span 
              className={styles['area-header']}>
              Area
            </span>
            <span 
              className={styles['area-value']}>
              {this.props.note.area.toFixed(2) + ' acres'}
            </span>
          </div>
      }

      return (
        <div 
          className={styles['new-note-background']}>
          <div 
            className={styles['new-note']}>
            <label htmlFor='input'>DESC<textarea
              className={styles['description']}
              id='description'
              name='description'
              style={{color: this.props.note.font_color}}
              type='text'
              value={this.props.text} 
              onChange={(e) => this.props.noteTextChanged({value: e.target.value, id:this.props.id})}
              rows={1} 
              tabIndex={1}
              autoFocus={true}
            />
            </label>
            <div 
              className={styles['tags-icon']}>
              <FontAwesome 
                name='tags'
              />
            </div>
            {areaContent}
            <EditTagsBar id={this.props.id}/>
          </div>
        </div>
      )
    }
  }
)
