import React from 'react';
import {connect} from '@cerebral/react'
import EditTagsBar from './editTagsBar.js';
import './note.css';
import Color from 'color'; 
import { props, state, signal } from 'cerebral/tags'
import { IconMenu, MenuItem, CardHeader, TextField, IconButton, Divider, Card } from 'material-ui'
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';

export default connect({
	note: state`notes.${props`type`}.${props`id`}`,
  editing: state`app.view.editing`,
  noteDropdownVisible: state`app.view.note_dropdown.visible`,
	noteDropdown: state`app.view.note_dropdown.note`,
	selectedNote: state`notes.selected_note`,

  deleteNoteButtonClicked: signal`notes.deleteNoteButtonClicked`,
  editNoteButtonClicked: signal`notes.editNoteButtonClicked`,
  noteClicked: signal`notes.noteClicked`,
  fieldClicked: signal`fields.fieldClicked`,
  noteTextChanged: signal`notes.noteTextChanged`,
  backgroundClicked: signal`notes.noteBackgroundClicked`,
	toggleNoteDropdown: signal`notes.toggleNoteDropdown`,
	expandComparisonsClicked: signal`notes.expandComparisonsClicked`,
},

  class Note extends React.Component {

    render() {
			let selected = this.props.selectedNote && this.props.id === this.props.selectedNote.id;
			const inputField = this.props.type === 'note' && this.props.selectedNote && this.props.editing ? input => {
        if (input) setTimeout(() => input.focus(), 100);
			} : null;
			let color = this.props.note ? Color(this.props.note.color || '#fff').alpha(0.4).rgb() : null;

      let yields = [];
      try {
        if (this.props.note['yield-stats'].stats.computing) {
          yields.push(
            <span
              key={'yield-waiting-'+this.props.id}
              className={this.props.note['yield-stats'].stats.computing ? 'blinker': 'hidden'}>
                {'Computing average yield...'}
            </span>
          )
        } else throw new Error('not computing')
      } catch(err) {
        try{
          Object.keys(this.props.note['yield-stats'].stats || {}).forEach((crop) => {
            yields.push(
              <div
                key={this.props.id+'-yield-text-'+crop}
                className={'yield-text'}>
                <span
                  key={this.props.id+'-yield-text-'+crop+'-header'}
                  className={'yield-text-header'}>
                    {crop.charAt(0).toUpperCase() + crop.slice(1) + ' Yield'}
                 </span>
                <span
                  key={this.props.id+'-yield-text-'+crop+'-value'}
                  className={'yield-text-value'}>
                    {this.props.note['yield-stats'].stats[crop].yield.mean.toFixed(2) + ' bu/ac'}
                </span>
              </div>
            )
            yields.push(
              <br key={this.props.id + '-yieldsbreak-'+crop}/>
            );
          })
        } catch(error) {
        }
			}

      let areaContent = null;
      if (this.props.note && this.props.note.geometry && this.props.note.geometry.area) {
        areaContent = 
          <div
            key={'area'}
            className={'area'}>
            <span 
              className={'area-header'}>
              Area  <div
								style={{
									color: this.props.note.color || '#000',
									backgroundColor: `rgba(${color.r },${color.g},${color.b},${color.a})` || '#fff',
								}}
                className={'note-area-box'}
              />
            </span>
            <span 
              className={'area-value'}>
              {this.props.note.geometry.area.toFixed(2) + ' acres'}
            </span>
          </div>
      }

			let comps = [];
      
		  (this.props.comparisons || {}).forEach((comp) => {
        Object.keys(comp.comparison).forEach((crop) => {
					let cropStr = crop.charAt(0).toUpperCase() + crop.slice(1);
					let sign = (comp.comparison[crop].comparison.differenceMeans < 0) ? '+' : '-';
          comps.push(
            <div
              key={this.props.id+'-'+comp.text+'-'+crop+'-comparison'}
              className={'comparison'}>
              <div
                key={this.props.id+'-'+comp.text+'-'+crop}
                className={'comparison-header'}>
								<div
									className={'comparison-text'}
									key={this.props.id+'-'+comp.text+'-'+crop}>
                  {comp.text}
								</div>
								{' ' + cropStr}
              </div>
              <span
                key={this.props.id+'-'+comp.text+'-'+crop+'-value'}
							  style={{color:sign === '-' ? '#F00' : '#0F0'}}
                className={'comparison-value'}>
                {comp['yield-stats'].stats[crop].yield.mean.toFixed(2) +
                ' (' + sign + Math.abs(comp.comparison[crop].comparison.differenceMeans).toFixed(2) + ') bu/ac' }
              </span>
            </div>
          )
				})
			})

      return (
        <Card
					onClick={() => this.props.noteClicked({id:this.props.id, type: this.props.type})}
          className={'note'}
          style={{order: this.props.order}}>
          <CardHeader
            className={'note-header'}
						style={{
							padding: '0px 0px 0px 10px',
							backgroundColor: (this.props.note) ? this.props.note.color || '#000' : '#000', 
							color: this.props.type === 'field' ? '#fff' : '#000', 
							fontWeight: selected ? 'bold' : 'normal',
						}}
						textStyle={{padding: '0px'}}>
						<div className={'text'}>
						{this.props.editing && selected ? <TextField
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
							ref={inputField}
              value={this.props.note.text} 
              onChange={(e, value) => this.props.noteTextChanged({value, id:this.props.id, type:this.props.type})}
							tabIndex={1}
							hintText='Type note description here...'
							hintStyle={{bottom: '2px'}}
							underlineShow={false}
						/> 
						: 
						<div
						  className={'note-text'}>
							{this.props.note ? this.props.note.text: ''}
					  </div>
						}
					</div>
				    <IconMenu
							menuStyle={{padding: '0px'}}
							iconButtonElement={
								<IconButton 
									style={{height:'25px', padding: '0px'}}
									onClick={(e)=>{e.stopPropagation()}}>
									<MoreVertIcon />
								</IconButton>
							}
              onRequestChange={()=>{this.props.toggleNoteDropdown({id:this.props.id, type:this.props.type})}}
              open={this.props.noteDropdownVisible && this.props.noteDropdown ===this.props.id}
              targetOrigin={{horizontal: 'right', vertical: 'top'}}
              anchorOrigin={{horizontal: 'right', vertical: 'top'}}>
							{selected && this.props.editing ? null : <MenuItem 
                primaryText="Edit" 
                onClick={(e)=>{this.props.editNoteButtonClicked({id:this.props.id, type:this.props.type})}}
              /> }
							{selected && this.props.editing ? null : <Divider /> }
              <MenuItem 
                primaryText="Delete"
                onClick={(e) => {this.props.deleteNoteButtonClicked({id:this.props.id, type:this.props.type})}}
              />
            </IconMenu>
          </CardHeader>
          <div
						className={this.props.note && this.props.note.geometry && this.props.note.geometry.area ? 'note-main-info' : 'hidden'}>
            {areaContent}
            {yields.length < 1 ? null : <br/>}
            {yields}
					</div>
					{comps.length ? <div
				  	className={'comparison-container'}>
						<div className={'comparisons-expander'}
						  onClick={() => this.props.expandComparisonsClicked({type:this.props.type, id:this.props.id})}>

							<hr className={'comp-hr'}/>
							{this.props.note.expanded ? 'Yield Comparisons \u25bc' : 'Yield Comparisons \u25b6'}
							<hr className={'comp-hr'}/>
						</div>
					  <div className={'comparisons'}>
							{this.props.note.expanded ? comps : null}
            </div>
          </div> : null }
          {(this.props.editing && selected) || (this.props.note && this.props.note.tags && this.props.note.tags.length > 0) ? <EditTagsBar selected={selected} id={this.props.id} type={this.props.type}/> : null }
        </Card>
      )
    }
  }
)
