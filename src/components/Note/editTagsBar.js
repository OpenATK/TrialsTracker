import React from 'react';
import { connect } from '@cerebral/react';
import './editTagsBar.css'
import { AutoComplete, Chip } from 'material-ui'
import { state, signal, props } from 'cerebral/tags'

let labelStyle = {paddingLeft: '6px', paddingRight: '6px', lineHeight:'26px'}

export default connect({
	  tags: state`notes.${props`type`}.${props`id`}.tags`,
    allTags: state`notes.tags`,
    editing: state`view.editing`,
	  tagInput: state`notes.tag_input_text`,
	  error: state`notes.${props`type`}.${props`id`}.tag_error`,

    tagAdded: signal`notes.tagAdded`,
    tagRemoved: signal`notes.tagRemoved`,
    tagTextChanged: signal`notes.tagTextChanged`,
},

  class EditTagsBar extends React.Component {
  
    render() {
      return (
        <div
          className={'edit-tags-bar'}>
						
          {this.props.selected && this.props.editing ? 
            Object.keys(this.props.tags || []).map((key, idx) => 
					  <Chip
							key={key+'-'+this.props.id}
							labelStyle={labelStyle}
							style={{marginLeft: idx>0 ? '3px' : '0px'}}
							onRequestDelete={() => this.props.tagRemoved({id: this.props.id, noteType: this.props.type, key})} 
						  className={'tag'}>
						  {this.props.tags[key]}
						</Chip>) 
					: Object.keys(this.props.tags).map((key, idx) => 
					  <Chip
							key={key+'-'+this.props.id}
							labelStyle={labelStyle}
							style={{marginLeft: idx>0 ? '3px' : '0px'}}
						  className={'tag'}>
						  {this.props.tags[key]}
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
            dataSource={Object.values(this.props.allTags || {}).map(obj => obj.text)}
            onUpdateInput={(value) => this.props.tagTextChanged({value, noteType: this.props.type, id:this.props.id})}
            onNewRequest={(text, id) => this.props.tagAdded({text, id:this.props.id, noteType: this.props.type})}
            searchText={this.props.tagInput}
					  onKeyDown={this.handleKeyDown}
					  tabIndex={2}
          /> : null }
        </div>
      )
    }
  }
) 
