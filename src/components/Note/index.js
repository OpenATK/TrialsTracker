import React from 'react';
import {connect} from '@cerebral/react'
import EditTagsBar from './editTagsBar.js';
import './note.css';
import Color from 'color'; 
import { props, state, signal } from 'cerebral/tags'
import { IconMenu, MenuItem, CardHeader, TextField, IconButton, Divider, Card } from 'material-ui'
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';

export default connect({
	note: state`notes.notes.${props`id`}`,
  editing: state`app.view.editing`,
  isMobile: state`app.is_mobile`,
  noteDropdownVisible: state`app.view.note_dropdown.visible`,
  noteDropdown: state`app.view.note_dropdown.note`,

  deleteNoteButtonClicked: signal`notes.deleteNoteButtonClicked`,
  editNoteButtonClicked: signal`notes.editNoteButtonClicked`,
  noteClicked: signal`notes.noteClicked`,
  fieldClicked: signal`fields.fieldClicked`,
  noteTextChanged: signal`notes.noteTextChanged`,
  backgroundClicked: signal`notes.noteBackgroundClicked`,
	showNoteDropdown: signal`notes.showNoteDropdown`,
	expandComparisonsClicked: signal`notes.expandComparisonsClicked`,
},

  class Note extends React.Component {

		render() {
			const inputField = this.props.type === 'note' && this.props.selected && this.props.editing ? input => {
        if (input) setTimeout(() => input.focus(), 100);
			} : null;
			let color = Color(this.props.color || '#000').alpha(0.4).rgb();

      let yields = [];
      if (this.props.stats && this.props.stats.computing) {
        yields.push(
          <span
            key={'yield-waiting-'+this.props.note.id}
            className={this.props.stats.computing ? 'blinker': 'hidden'}>
              {'Computing average yield...'}
          </span>
        )
			} else {
				Object.keys(this.props.stats || {}).forEach((crop) => {
          yields.push(
            <div
              key={this.props.note.id+'-yield-text-'+crop}
              className={'yield-text'}>
              <span
                key={this.props.note.id+'-yield-text-'+crop+'-header'}
                className={'yield-text-header'}>
                  {crop.charAt(0).toUpperCase() + crop.slice(1) + ' Yield'}
               </span>
              <span
                key={this.props.note.id+'-yield-text-'+crop+'-value'}
                className={'yield-text-value'}>
                  {this.props.stats[crop].yield.mean.toFixed(2) + ' bu/ac'}
              </span>
            </div>
          )
          yields.push(
            <br key={this.props.note.id + '-yieldsbreak-'+crop}/>
          );
		  	})
      }

      let areaContent = null;
      if (this.props.area) {
        areaContent = 
          <div
            key={'area'}
            className={'area'}>
            <span 
              className={'area-header'}>
              Area  <div
								style={{
									color: this.props.type === 'note' ? this.props.color : '#000',
									backgroundColor: this.props.type === 'note' ? `rgba(${color.r },${color.g},${color.b},${color.a})` : '#fff'}}
                className={'note-area-box'}
              />
            </span>
            <span 
              className={'area-value'}>
              {this.props.area.toFixed(2) + ' acres'}
            </span>
          </div>
      }

		  let comps = [];
		  (this.props.comparisons || {}).forEach((comp) => {
        Object.keys(comp.comparison).forEach((crop) => {
					let cropStr = crop.charAt(0).toUpperCase() + crop.slice(1);
					let sign = (comp.comparison[crop].comparison.differenceMeans < 0 ^ this.props.type === 'note') ? '-' : '+';
          comps.push(
            <div
              key={this.props.note.id+'-'+comp.text+'-'+crop+'-comparison'}
              className={'comparison'}>
              <div
                key={this.props.note.id+'-'+comp.text+'-'+crop}
                className={'comparison-header'}>
								<div
									className={'comparison-text'}
									key={this.props.note.id+'-'+comp.text+'-'+crop}>
                  {comp.text}
								</div>
								{' ' + cropStr}
              </div>
              <span
                key={this.props.note.id+'-'+comp.text+'-'+crop+'-value'}
                className={'comparison-value'}>
                {comp.stats[crop].yield.mean.toFixed(2) +
                ' (' + sign + Math.abs(comp.comparison[crop].comparison.differenceMeans).toFixed(2) + ') bu/ac' }
              </span>
            </div>
          )
				})
			})

      return (
        <Card
					onTouchTap={this.props.type === 'note' ? (e) => this.props.noteClicked({id:this.props.note.id}) : (e) => this.props.fieldClicked({id:this.props.note.id})}
          className={'note'}
          style={{order: this.props.order}}>
          <CardHeader
            className={'note-header'}
						style={{
							padding: '0px 0px 0px 10px',
							backgroundColor: this.props.color || '#000', 
							color: this.props.type === 'field' ? '#fff' : '#000', 
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
							ref={inputField}
              value={this.props.text} 
              onChange={(e, value) => this.props.noteTextChanged({value, id:this.props.note.id})}
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
              onRequestChange={()=>{this.props.showNoteDropdown({id:this.props.note.id})}}
              open={this.props.noteDropdownVisible && this.props.noteDropdown ===this.props.note.id}
              targetOrigin={{horizontal: 'right', vertical: 'top'}}
              anchorOrigin={{horizontal: 'right', vertical: 'top'}}>
							{this.props.selected && this.props.editing ? null : <MenuItem 
                primaryText="Edit" 
                onTouchTap={(e)=>{this.props.editNoteButtonClicked({id:this.props.note.id})}}
              /> }
							{this.props.selected && this.props.editing ? null : <Divider /> }
              <MenuItem 
                primaryText="Delete"
                onTouchTap={(e) => {this.props.deleteNoteButtonClicked({id:this.props.note.id})}}
              />
            </IconMenu>
          </CardHeader>
          <div
						className={this.props.area ? 'note-main-info' : 'hidden'}>
            {areaContent}
            {yields.length < 1 ? null : <br/>}
            {yields}
					</div>
					{comps.length ? <div
				  	className={'comparison-container'}>
						<div className={'comparisons-expander'}
						  onClick={() => this.props.expandComparisonsClicked({path:this.props.path})}>
							<hr className={'comp-hr'}/>
							{this.props.note.expanded ? 'Yield Comparisons \u25bc' : 'Yield Comparisons \u25b6'}
							<hr className={'comp-hr'}/>
						</div>
					  <div className={'comparisons'}>
							{this.props.note.expanded ? comps : null}
            </div>
          </div> : null }
          {(this.props.editing && this.props.selected) || (this.props.note.tags && this.props.note.tags.length > 0) ? <EditTagsBar selected={this.props.selected} id={this.props.note.id}/> : null }
        </Card>
      )
    }
  }
)
