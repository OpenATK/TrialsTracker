import React from 'react';
import {connect} from '@cerebral/react'
import EditTagsBar from './editTagsBar.js';
import uuid from 'uuid';
import './note.css';
import Color from 'color'; 
import { props, state, signal } from 'cerebral/tags'
import { IconMenu, MenuItem, CardHeader, TextField, IconButton, Divider, Card } from 'material-ui'
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';

export default connect({
  note: state`Note.notes.${props`id`}`,
  text: state`Note.notes.${props`id`}.text`,
  selected: state`Note.notes.${props`id`}.selected`,
  editing: state`App.view.editing`,
  geometryVisible: state`Note.notes.${props`id`}.geometry_visible`,
  noteFields: state`Note.notes.${props`id`}.fields`,
  fields: state`Fields`,
  isMobile: state`App.is_mobile`,
  noteDropdownVisible: state`App.view.note_dropdown.visible`,
  noteDropdown: state`App.view.note_dropdown.note`,

  deleteNoteButtonClicked: signal`Note.deleteNoteButtonClicked`,
  editNoteButtonClicked: signal`Note.editNoteButtonClicked`,
  noteClicked: signal`Note.noteClicked`,
  noteTextChanged: signal`Note.noteTextChanged`,
  backgroundClicked: signal`Note.noteBackgroundClicked`,
	showNoteDropdown: signal`Note.showNoteDropdown`,
},

  class Note extends React.Component {

		render() {
			const inputField = this.props.selected && this.props.editing ? input => {
        if (input) setTimeout(() => input.focus(), 100);
      } : null;
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
      if (this.props.note.geometry.area) {
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
              {this.props.note.geometry.area.toFixed(2) + ' acres'}
            </span>
          </div>
      }

      let fieldComparisons = [];
      Object.keys(this.props.noteFields || {}).forEach((field) => {
        Object.keys(this.props.note.stats).forEach((crop, idx) => {
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
        })
      })

      return (
        <Card
          onTouchTap={(e) => this.props.noteClicked({id:this.props.id})}
          className={'note'}
          style={{order: this.props.note.order}}>
          <CardHeader
            className={'note-header'}
						style={{
							padding: '0px 0px 0px 10px',
							backgroundColor: this.props.note.color, 
							fontWeight: this.props.selected ? 'bold' : 'normal',
						}}
						textStyle={{padding: '0px'}}>
						<div className={'text'}>
						{this.props.editing && this.props.selected ? <TextField
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
              value={this.props.text} 
              onChange={(e, value) => this.props.noteTextChanged({value, id:this.props.id})}
							tabIndex={1}
							hintText='Type note description here...'
							hintStyle={{bottom: '2px'}}
							underlineShow={false}
						/> 
						: 
						<div
						  className={'note-text'}>
							{this.props.text}
					  </div>
						}
					</div>
				    <IconMenu
							menuStyle={{padding: '0px'}}
							iconButtonElement={
								<IconButton 
									style={{height:'25px', padding: '0px'}}
									onTouchTap={(e)=>{e.stopPropagation()}}>
									<MoreVertIcon />
								</IconButton>
							}
              onRequestChange={()=>{this.props.showNoteDropdown({id:this.props.id})}}
              open={this.props.noteDropdownVisible && this.props.noteDropdown ===this.props.id}
              targetOrigin={{horizontal: 'right', vertical: 'top'}}
              anchorOrigin={{horizontal: 'right', vertical: 'top'}}>
							{this.props.selected && this.props.editing ? null : <MenuItem 
                primaryText="Edit" 
                onTouchTap={(e)=>{this.props.editNoteButtonClicked({id:this.props.id})}}
              /> }
							{this.props.selected && this.props.editing ? null : <Divider /> }
              <MenuItem 
                primaryText="Delete"
                onTouchTap={(e) => {this.props.deleteNoteButtonClicked({id:this.props.id})}}
              />
            </IconMenu>
          </CardHeader>
          <div
            className={this.props.note.geometry.area ? 'note-main-info' : 'hidden'}>
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
          {(this.props.editing && this.props.selected) || this.props.note.tags.length > 0 ? <EditTagsBar id={this.props.id}/> : null }
        </Card>
      )
    }
  }
)
