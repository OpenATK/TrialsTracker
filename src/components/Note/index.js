import React, { PropTypes } from 'react';
import {connect} from 'cerebral-view-react'
import TextAreaAutoSize from 'react-textarea-autosize';
import EditTagsBar from './editTagsBar.js';
import uuid from 'uuid';
import styles from './note.css';
import Color from 'color'; 
import FontAwesome from 'react-fontawesome';
import NewNoteScreen from '../NewNoteScreen';

export default connect(props => ({
  note: `app.model.notes.${props.id}`,
  text: `app.model.notes.${props.id}.text`,
  tags: `app.model.notes.${props.id}.tags`,
  selected: `app.model.notes.${props.id}.selected`,
  editingNote: 'app.view.editing_note',
  geometryVisible: `app.model.notes.${props.id}.geometry_visible`,
  drawing: 'app.view.map.drawing_note_polygon',
  noteFields: `app.model.notes.${props.id}.fields`,
  fields: 'app.model.fields',
  isMobile: 'app.is_mobile',
  noteDropdownVisible: 'app.view.note_dropdown.visible',
  noteDropdown: 'app.view.note_dropdown.note',
}), {
  deleteNoteButtonClicked: 'app.deleteNoteButtonClicked',
  doneDrawingButtonClicked: 'app.doneDrawingButtonClicked',
  editNoteButtonClicked: 'app.editNoteButtonClicked',
  noteClicked: 'app.noteClicked',
  noteTextChanged: 'app.noteTextChanged',
  backgroundClicked: 'app.noteBackgroundClicked',
  showNoteDropdown: 'app.showNoteDropdown',
},

  class Note extends React.Component {

    render() {
      var editing = this.props.editingNote ?
        (this.props.selected ? true:false) : false
      if (!this.props.note) return null;
      var yields = [];
      if (this.props.note.stats.computing) {
        yields.push(
          <span
            key={'yield-waiting-2-'+this.props.note.id}
            className={styles[this.props.note.stats.computing ? 
              'blinker': 'hidden']}>
              {'Computing average yield...'}
          </span>
        )
      } else {
        Object.keys(this.props.note.stats).forEach((crop) => {
          var cropStr = crop.charAt(0).toUpperCase() + crop.slice(1);
          if (!isNaN(this.props.note.stats[crop].mean_yield)) {
            yields.push(
              <div
                key={this.props.note.id+'-yield-text-'+crop}
                className={styles['yield-text']}>
                <span
                  key={this.props.note.id+'-yield-text-'+crop+'-header'}
                  className={styles['yield-text-header']}>
                    {cropStr + ' Yield'}
                </span>
                <span
                  key={this.props.note.id+'-yield-text-'+crop+'-value'}
                  className={styles['yield-text-value']}>
                    {this.props.note.stats[crop].mean_yield.toFixed(1) + ' bu/ac'}
                </span>
              </div>
            )
            yields.push(
              <br key={uuid.v4()}/>
            );
          }
        })
      }

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

      var fieldComparisons = [];
      console.log(this.props.noteFields);
      if (this.props.noteFields) {
        Object.keys(this.props.noteFields).forEach((field) => {
          Object.keys(this.props.note.stats).forEach((crop, idx) => {
            if (!isNaN(this.props.note.stats[crop].mean_yield)) {
              if (this.props.noteFields[field][crop]) {
                var cropStr = crop.charAt(0).toUpperCase() + crop.slice(1);
                var sign = (this.props.noteFields[field][crop].difference < 0) ? '' : '+';
                fieldComparisons.push(
                  <div
                    key={this.props.note.id+'-'+field+'-'+crop+'-comparison'}
                    style={{order:idx}}
                    className={styles['field-comparison']}>
                    <span
                      key={this.props.note.id+'-'+field+'-'+crop+'-field'}
                      className={styles['field-comparison-header']}>
                      {field + ' ' +cropStr}
                    </span>
                    <span
                      key={this.props.note.id+'-'+field+'-'+crop+'-value'}
                      className={styles['field-comparison-value']}>
                      {this.props.fields[field].stats[crop].mean_yield.toFixed(1) +
                      ' (' + sign + (this.props.noteFields[field][crop].difference).toFixed(2) + ') bu/ac' }
                    </span>
                  </div>
                );
              }
            }
          })
        })
      }

      return (
        <div 
          style={{order: this.props.note.order, }} 
          className={styles[this.props.selected ? 'selected-note' : 'note']} 
          onClick={(e) => this.props.noteClicked({id:this.props.id})}>
          <div
            style={{backgroundColor: this.props.note.color}}
            className={styles['note-upper']}>
            <textarea
              className={styles['note-text-input']}
              id={this.props.id+'-input'}
              style={{color: this.props.note.font_color}}
              type='text'
              value={this.props.text} 
              onChange={(e) => this.props.noteTextChanged({value: e.target.value, id:this.props.id})}
              rows={1} 
              tabIndex={1}
              autoFocus={editing}
              placeholder='Type note description here...'
              readOnly={editing ? false : "readonly"}
            />
            <div 
              className={styles['edit-note-button']}
              onClick={(e)=>{e.stopPropagation();this.props.showNoteDropdown({id:this.props.id})}}>
              <FontAwesome 
                name='ellipsis-v'
                style={{color: this.props.note.font_color}}
                className={styles['edit-note-icon']}
              />
              {(this.props.noteDropdownVisible && this.props.noteDropdown ===this.props.id) ? 
              <div
                className={styles['note-dropdown']}>
                <span
                  onClick={(e)=>{e.stopPropagation();this.props.editNoteButtonClicked({id:this.props.id})}}>
                  Edit 
                </span>
                <br/>
                <span
                  onClick={(e) => {e.stopPropagation(); this.props.deleteNoteButtonClicked({id:this.props.id})}}>
                  Delete
                </span>
              </div> : null}
              {(this.props.noteDropdownVisible && this.props.noteDropdown ===this.props.id) ? 
              <div className={styles['note-dropdown-container']} /> : null }
            </div>
          </div>
          <div
            className={styles[this.props.note.area ?
              'note-main-info' : 'hidden']}>
            {areaContent}
            {yields.length < 1 ? null : <br/>}
            {yields}
            {fieldComparisons.length === 1 ? 
            <div
              className={styles['field-comparisons']}>
              {fieldComparisons}
            </div> : null}
          </div>
          <div 
            className={styles['field-comparisons-section']}>
            {fieldComparisons.length > 1 ? <hr/> : null}
            {fieldComparisons.length > 1 ? 
            <div
              className={styles['field-comparisons']}>
              {fieldComparisons}
            </div> : null}
          </div>
          <hr 
            className={styles[editing && this.props.selected ? 
              'hr' : 'hidden']}
          />
        {this.props.isMobile ? 
        <span 
          tabIndex={2}
          className={styles[this.props.editing ?
          'done-editing-bar': 'hidden']}
          onClick={(e) => {e.stopPropagation(); this.props.doneDrawingButtonClicked({id:this.props.selectedNote})}}>
          DONE
        </span> : null}
        <div 
          tabIndex={2}
          className={styles[this.props.selected && editing ?
            'done-editing-button' : 'hidden']}
          onClick={(e) => {e.stopPropagation(); this.props.doneDrawingButtonClicked({id:this.props.id})}}>
          <FontAwesome 
            name='check'
            className={styles['done-editing-icon']}
          />
        </div>
        <EditTagsBar id={this.props.id}/>
        </div>
      )
    }
  }
)
