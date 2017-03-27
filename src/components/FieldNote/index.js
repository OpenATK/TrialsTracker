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
  fieldNote: `app.model.fields.${props.id}`,
  noteFields: `app.model.note.${props.id}.fields`,
  notes: 'app.model.notes',
  isMobile: 'app.is_mobile',
}), {
  noteClicked: 'app.fieldNoteClicked',
},

  class FieldNote extends React.Component {

    render() {
      if (!this.props.fieldNote) return null;
      var yields = [];
      Object.keys(this.props.fieldNote.stats).forEach((crop) => {
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

      var area = null;
      var areaContent = null;
      if (this.props.note.area) {
        area = 'Area: ' + this.props.fieldNote.area.toFixed(2) + ' acres';
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
              {this.props.fieldNote.area.toFixed(2) + ' acres'}
            </span>
          </div>
      }

      var fieldComparisons = [];
      if (this.props.noteFields) {
      Object.keys(this.props.notes.stats).forEach((note) => {
        Object.keys(this.props.notes[note].fields).forEach((field) => {


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
          className={styles[this.props.selected ? 'selected-note' : 'note']}>
          <div
            className={styles['note-upper']}>
            <span
              className={styles['note-text-input']}
              type='text'
              value={this.props.fieldNote.name} 
              readOnly={"readonly"}
            />
          </div>
          <div
            className={styles[this.props.fieldNote.area ?
              'note-main-info' : 'hidden']}>
            {areaContent}
            {yields.length < 1 ? null : <br/>}
            {yields}
            {noteComparisons.length === 1 ? 
            <div
              className={styles['field-comparisons']}>
              {noteComparisons}
            </div> : null}
          </div>
          <div 
            className={styles['field-comparisons-section']}>
            {noteComparisons.length > 1 ? <hr/> : null}
            {noteComparisons.length > 1 ? 
            <div
              className={styles['field-comparisons']}>
              {noteComparisons}
            </div> : null}
          </div>
          <hr 
            className={styles[editing && this.props.selected ? 
              'hr' : 'hidden']}
          />
        </div>
      )
    }
  }
)
