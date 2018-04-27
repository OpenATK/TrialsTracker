import React from 'react';
import {connect} from '@cerebral/react'
import TextAreaAutoSize from 'react-textarea-autosize';
import uuid from 'uuid';
import './note.css';
import Color from 'color'; 
import { props, state, signal } from 'cerebral/tags'

export default connect({
  tagNote: state`App.model.tags.${props.id}`,
  notes: state`notes`,
  isMobile: state`App.is_mobile`,

  fieldClicked: signal`App.fieldNoteClicked`,
},

  class TagNote extends React.Component {

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
                className={'yield-text'}>
                <span
                  key={this.props.fieldNote.id+'-yield-text-'+crop+'-header'}
                  className={'yield-text-header'}>
                    {cropStr + ' Yield'}
                </span>
                <span
                  key={this.props.fieldNote.id+'-yield-text-'+crop+'-value'}
                  className={'yield-text-value'}>
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
            className={'area'}>
            <span 
              className={'area-header'}>
              Area
            </span>
            <span 
              className={'area-value'}>
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
                  className={'field-comparison'}>
                  <span
                    key={this.props.id+'-'+field+'-'+crop+'-field'}
                    className={'field-comparison-header'}>
                    {this.props.notes[id].text+ ' - ' +cropStr}
                  </span>
                  <span
                    key={this.props.id+'-'+field+'-'+crop+'-value'}
                    className={'field-comparison-value'}>
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
          className={this.props.selected ? 'selected-note' : 'note'}>
          <div
            className={'note-upper'}>
            <span
              className={'note-text-input'}
              type='text'
              value={this.props.fieldNote.name} 
              readOnly={"readonly"}>
              {this.props.fieldNote.name}
            </span>
          </div>
          <div
            className={this.props.fieldNote.boundary.area ?
              'note-main-info' : 'hidden'}>
            {areaContent}
            {yields.length < 1 ? null : <br/>}
            {yields}
            {noteComparisons.length === 1 ? 
            <div
              className={'field-comparisons'}>
              {noteComparisons}
            </div> : null}
          </div>
          <div 
            className={'field-comparisons-section'}>
            {noteComparisons.length > 1 ? <hr/> : null}
            {noteComparisons.length > 1 ? 
            <div
              className={'field-comparisons'}>
              {noteComparisons}
            </div> : null}
          </div>
        </div>
      )
    }
  }
)
