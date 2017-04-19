import React, { PropTypes } from 'react';
import {connect} from 'cerebral/react'
import TextAreaAutoSize from 'react-textarea-autosize';
import EditTagsBar from './editTagsBar.js';
import uuid from 'uuid';
import styles from './note.css';
import Color from 'color'; 
import FontAwesome from 'react-fontawesome';
import NewNoteScreen from '../NewNoteScreen';

export default connect(props => ({
  fieldNote: `app.model.fields.${props.id}`,
  notes: 'app.model.notes',
  isMobile: 'app.is_mobile',
}), {
  fieldClicked: 'app.fieldNoteClicked',
},

  class FieldNote extends React.Component {

    render() {
      if (!this.props.fieldNote) return null;
      var yields = [];
      if (this.props.fieldNote.stats) {
      Object.keys(this.props.fieldNote.stats).forEach((crop) => {
        var cropStr = crop.charAt(0).toUpperCase() + crop.slice(1);
        if (!isNaN(this.props.fieldNote.stats[crop].mean_yield)) {
          yields.push(
            <div
              key={this.props.fieldNote.id+'-yield-text-'+crop}
              className={styles['yield-text']}>
              <span
                key={this.props.fieldNote.id+'-yield-text-'+crop+'-header'}
                className={styles['yield-text-header']}>
                  {cropStr + ' Yield'}
              </span>
              <span
                key={this.props.fieldNote.id+'-yield-text-'+crop+'-value'}
                className={styles['yield-text-value']}>
                  {this.props.fieldNote.stats[crop].mean_yield.toFixed(1) + ' bu/ac'}
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
      if (this.props.fieldNote.boundary.area) {
        area = 'Area: ' + this.props.fieldNote.boundary.area.toFixed(2) + ' acres';
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
              {this.props.fieldNote.boundary.area.toFixed(2) + ' acres'}
            </span>
          </div>
      }

      var noteComparisons = [];
      if (this.props.noteFields) {
        Object.keys(this.props.notes).forEach((id) => {
          var noteFields = this.props.notes[id].fields;
          if (noteFields[this.props.id]) {
            Object.keys(noteFields[this.props.id]).forEach((crop, idx) => {
              var cropStr = crop.charAt(0).toUpperCase() + crop.slice(1);
              var sign = (noteFields[this.props.id][crop].difference < 0) ? '' : '+';
              noteComparisons.push(
                <div
                  key={this.props.id+'-'+field+'-'+crop+'-comparison'}
                  style={{order:idx}}
                  className={styles['field-comparison']}>
                  <span
                    key={this.props.id+'-'+field+'-'+crop+'-field'}
                    className={styles['field-comparison-header']}>
                    {this.props.notes[id].text+ ' - ' +cropStr}
                  </span>
                  <span
                    key={this.props.id+'-'+field+'-'+crop+'-value'}
                    className={styles['field-comparison-value']}>
                    {noteFields[this.props.id].stats[crop].mean_yield.toFixed(1) +
                    ' (' + sign + (this.props.notes[id][crop].difference).toFixed(2) + ') bu/ac' }
                  </span>
                </div>
              );
            })
          }
        })
      }

      return (
        <div 
          onClick={(e) => this.props.fieldClicked({id:this.props.id})}
          className={styles[this.props.selected ? 'selected-note' : 'note']}>
          <div
            className={styles['note-upper']}>
            <span
              className={styles['note-text-input']}
              type='text'
              value={this.props.fieldNote.name} 
              readOnly={"readonly"}>
              {this.props.fieldNote.name}
            </span>
          </div>
          <div
            className={styles[this.props.fieldNote.boundary.area ?
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
        </div>
      )
    }
  }
)
