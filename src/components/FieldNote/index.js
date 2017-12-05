import React from 'react';
import {connect} from '@cerebral/react'
import uuid from 'uuid';
import './note.css';
import { Card, CardHeader } from 'material-ui'
import {state, signal, props} from 'cerebral/tags'

export default connect({
  fieldNote: state`Fields.${props`id`}`,
  notes: state`Notes`,
  isMobile: state`App.is_mobile`,

  fieldClicked: signal`Map.fieldNoteClicked`,
},

  class FieldNote extends React.Component {

    render() {
      if (!this.props.fieldNote) return null;
      let yields = [];
      if (this.props.fieldNote.stats) {
        Object.keys(this.props.fieldNote.stats).forEach((crop) => {
          let cropStr = crop.charAt(0).toUpperCase() + crop.slice(1);
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

      let areaContent = null;
      if (this.props.fieldNote.boundary.area) {
        areaContent = 
          <div
            key={'area'}
            className={'area'}>
            <span 
              className={'area-header'}>
							Area 
					    <div
                style={{color: '#000', backgroundColor: '#fff'}}
                className={'note-area-box'}
              />
            </span>
            <span 
              className={'area-value'}>
              {this.props.fieldNote.boundary.area.toFixed(2) + ' acres'}
            </span>
          </div>
      }

      let noteComparisons = [];
      if (this.props.noteFields) {
        Object.keys(this.props.notes).forEach((id) => {
          let noteFields = this.props.notes[id].fields;
          if (noteFields[this.props.id]) {
            Object.keys(noteFields[this.props.id]).forEach((crop, idx) => {
              let cropStr = crop.charAt(0).toUpperCase() + crop.slice(1);
              let sign = (noteFields[this.props.id][crop].difference < 0) ? '' : '+';
              noteComparisons.push(
                <div
                  key={this.props.id+'-field-'+crop+'-comparison'}
                  style={{order:idx}}
                  className={'field-comparison'}>
                  <span
                    key={this.props.id+'-'+crop+'-field'}
                    className={'field-comparison-header'}>
                    {this.props.notes[id].text+ ' - ' +cropStr}
                  </span>
                  <span
                    key={this.props.id+'-'+crop+'-value'}
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
        <Card 
          onTouchTap={(e) => this.props.fieldClicked({id:this.props.id})}
          className={this.props.selected ? 'selected-note' : 'note'}>
					<CardHeader
						className={'note-header'}
						style={{
							padding: '0px 0px 0px 10px',
							fontWeight: this.props.selected ? 'bold' : 'normal',
						}}
						textStyle={{padding: '0px'}}>
						<div
						  className={'note-text'}>
							{this.props.text}
					  </div>
            <span
              className={'note-text-input'}
              type='text'
              value={this.props.id} 
              readOnly={"readonly"}>
              {this.props.id}
            </span>
          </CardHeader>
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
        </Card>
      )
    }
  }
)
