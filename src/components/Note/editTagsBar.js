import React from 'react';
import { connect } from '@cerebral/react';
import './editTagsBar.css'
import { AutoComplete, Chip } from 'material-ui'
import { state, signal, props } from 'cerebral/tags'

let labelStyle = {paddingLeft: '6px', paddingRight: '6px', lineHeight:'26px'}

export default connect({
	  tags: state`Note.notes.${props`id`}.tags`,
	  selected: state`Note.notes.${props`id`}.selected`,
    allTags: state`App.model.tags`,
    editing: state`App.view.editing`,
	  tagInput: state`App.model.tag_input_text`,
	  error: state`Note.notes.${props`id`}.tag_error`,

    tagAdded: signal`Note.tagAdded`,
    tagRemoved: signal`Note.tagRemoved`,
    tagInputTextChanged: signal`Note.tagInputTextChanged`,
},

  class EditTagsBar extends React.Component {
  
		render() {
      return (
        <div
          className={'edit-tags-bar'}>
						
					{this.props.selected && this.props.editing ? this.props.tags.map((tag, idx) => 
					  <Chip
							key={this.props.id + tag}
							labelStyle={labelStyle}
							style={{marginLeft: idx>0 ? '3px' : '0px'}}
							onRequestDelete={() => this.props.tagRemoved({idx})} 
						  className={'tag'}>
						  {tag}
						</Chip>) 
					: this.props.tags.map((tag, idx) => 
					  <Chip
              key={this.props.id + tag} 
							labelStyle={labelStyle}
							style={{marginLeft: idx>0 ? '3px' : '0px'}}
						  className={'tag'}>
						  {tag}
						</Chip>) 
					}
				  {this.props.editing && this.props.selected ? <AutoComplete
						style={{height:'30px'}}
						underlineStyle={{bottom: '0px'}}
					  textFieldStyle={{height:'30px'}}
						hintStyle={{bottom: '0px'}}
						errorStyle={{bottom: '17px'}}
            className={'input'}
						hintText={this.props.error ? null : 'Add a new tag...'}
						errorText={this.props.error ? this.props.error : null}
						dataSource={Object.keys(this.props.allTags).filter(tag => tag.indexOf(this.props.tagInput) > -1)}
            onUpdateInput={(value) => this.props.tagInputTextChanged({value, noteId:this.props.id})}
            onNewRequest={(text, id) => this.props.tagAdded({text, noteId:this.props.id})}
            searchText={this.props.tagInput}
					  onKeyDown={this.handleKeyDown}
					  tabIndex={2}
          /> : null }
        </div>
      )
    }
  }
) 
