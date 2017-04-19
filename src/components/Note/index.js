import React from 'react';
import {connect} from 'cerebral/react'
import EditTagsBar from './editTagsBar.js';
import uuid from 'uuid';
import './note.css';
import Color from 'color'; 
import FontAwesome from 'react-fontawesome';
import { props, state, signal } from 'cerebral/tags'

export default connect({
  note: state`app.model.notes.${props`id`}`,
  text: state`app.model.notes.${props`id`}.text`,
  tags: state`app.model.notes.${props`id`}.tags`,
  selected: state`app.model.notes.${props`id`}.selected`,
  editing: state`app.view.editing_note`,
  geometryVisible: state`app.model.notes.${props`id`}.geometry_visible`,
  noteFields: state`app.model.notes.${props`id`}.fields`,
  fields: state`app.model.fields`,
  isMobile: state`app.is_mobile`,
  noteDropdownVisible: state`app.view.note_dropdown.visible`,
  noteDropdown: state`app.view.note_dropdown.note`,

  deleteNoteButtonClicked: signal`note.deleteNoteButtonClicked`,
  editNoteButtonClicked: signal`note.editNoteButtonClicked`,
  noteClicked: signal`note.noteClicked`,
  noteTextChanged: signal`note.noteTextChanged`,
  backgroundClicked: signal`note.noteBackgroundClicked`,
  showNoteDropdown: signal`note.showNoteDropdown`,
},

  class Note extends React.Component {

    render() {
      let color = Color(this.props.note.color).alpha(0.4).rgb();
      if (!this.props.note) return null;
      let yields = [];
      if (this.props.note.stats.computing) {
        yields.push(
          <span
            key={'yield-waiting-2-'+this.props.note.id}
            className={this.props.note.stats.computing ? 'blinker': 'hidden'}>
              {'Computing average yield...'}
          </span>
        )
      } else {
        Object.keys(this.props.note.stats).forEach((crop) => {
          let cropStr = crop.charAt(0).toUpperCase() + crop.slice(1);
          if (!isNaN(this.props.note.stats[crop].mean_yield)) {
            yields.push(
              <div
                key={this.props.note.id+'-yield-text-'+crop}
                className={'yield-text'}>
                <span
                  key={this.props.note.id+'-yield-text-'+crop+'-header'}
                  className={'yield-text-header'}>
                    {cropStr + ' Yield'}
                </span>
                <span
                  key={this.props.note.id+'-yield-text-'+crop+'-value'}
                  className={'yield-text-value'}>
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

      let areaContent = null;
      if (this.props.note.area) {
      //  let area = 'Area: ' + this.props.note.area.toFixed(2) + ' acres';
        areaContent = 
          <div
            key={'area'}
            className={'area'}>
            <span 
              className={'area-header'}>
              Area  <div
                style={{color: this.props.note.color, backgroundColor:`rgba(${color.r},${color.g},${color.b},${color.a})`}}
                className={'note-area-box'}
              />
            </span>
            <span 
              className={'area-value'}>
              {this.props.note.area.toFixed(2) + ' acres'}
            </span>
          </div>
      }

      let fieldComparisons = [];
      if (this.props.noteFields) {
        Object.keys(this.props.noteFields).forEach((field) => {
          Object.keys(this.props.note.stats).forEach((crop, idx) => {
            if (!isNaN(this.props.note.stats[crop].mean_yield)) {
              if (this.props.noteFields[field][crop]) {
                let cropStr = crop.charAt(0).toUpperCase() + crop.slice(1);
                let sign = (this.props.noteFields[field][crop].difference < 0) ? '' : '+';
                fieldComparisons.push(
                  <div
                    key={this.props.note.id+'-'+field+'-'+crop+'-comparison'}
                    style={{order:idx}}
                    className={'field-comparison'}>
                    <span
                      key={this.props.note.id+'-'+field+'-'+crop+'-field'}
                      className={'field-comparison-header'}>
                      {field + ' ' +cropStr}
                    </span>
                    <span
                      key={this.props.note.id+'-'+field+'-'+crop+'-value'}
                      className={'field-comparison-value'}>
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
          className={this.props.selected ? 'selected-note' : 'note'} 
          onClick={(e) => this.props.noteClicked({id:this.props.id})}>
          <div
            style={{backgroundColor: this.props.note.color}}
            className={'note-upper'}>
            <textarea
              className={'note-text-input'}
              id={this.props.id+'-input'}
              style={{color: this.props.note.font_color}}
              type='text'
              value={this.props.text} 
              onChange={(e) => this.props.noteTextChanged({value: e.target.value, id:this.props.id})}
              rows={1} 
              tabIndex={1}
              autoFocus={this.props.editing && this.props.selected}
              placeholder='Type note description here...'
              readOnly={this.props.editing && this.props.selected ? false : "readonly"}
            />
            <div 
              className={'edit-note-button'}
              onClick={(e)=>{e.stopPropagation();this.props.showNoteDropdown({id:this.props.id})}}>
              <FontAwesome 
                name='ellipsis-v'
                style={{color: this.props.note.font_color}}
                className={'edit-note-icon'}
              />
              {(this.props.noteDropdownVisible && this.props.noteDropdown ===this.props.id) ? 
              <div
                className={'note-dropdown'}>
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
              <div className={'note-dropdown-container'} /> : null }
            </div>
          </div>
          <div
            className={this.props.note.area ? 'note-main-info' : 'hidden'}>
            {areaContent}
            {yields.length < 1 ? null : <br/>}
            {yields}
            {fieldComparisons.length === 1 ? 
            <div
              className={'field-comparisons'}>
              {fieldComparisons}
            </div> : null}
          </div>
          <div 
            className={'field-comparisons-section'}>
            {fieldComparisons.length > 1 ? <hr/> : null}
            {fieldComparisons.length > 1 ? 
            <div
              className={'field-comparisons'}>
              {fieldComparisons}
            </div> : null}
          </div>
          <hr 
            className={this.props.editing && this.props.selected ? 
              'hr' : 'hidden'}
          />
          <EditTagsBar id={this.props.id}/>
        </div>
      )
    }
  }
)
