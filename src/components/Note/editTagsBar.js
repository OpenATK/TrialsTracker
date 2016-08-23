import React, { PropTypes } from 'react';
import { connect } from 'cerebral-view-react';
import uuid from 'uuid';
import styles from './editTagsBar.css'
import fastyles from '../css/font-awesome.min.css';
import FontAwesome from 'react-fontawesome';

export default connect(props => ({
  tags: `app.model.notes.${props.id}.tags`,
  allTags: 'app.model.tags',
  editing: 'app.view.editing_note',
  selected: `app.model.notes.${props.id}.selected`,
}), {
  tagAdded: 'app.tagAdded',
  tagRemoved: 'app.tagRemoved',
},

  class EditTagsBar extends React.Component {

    constructor(props) {
      super(props)
    }
   
    componentWillMount() {
      this.handleKeyDown = this.handleKeyDown.bind(this);
    }
  
    handleKeyDown(evt) {
      if (evt.keyCode == 13 || evt.keyCode == 9) {
        this.props.tagAdded({text: evt.target.value});
      }
    }
  
    render() {
      var tags = [];
      var self = this;
/*
      (this.props.tags).forEach((tag) => {
        tags.push(<div 
          key={uuid.v4()} 
          className={styles["tag"]}>
            <FontAwesome 
              name='times'
              size='lg'
              className={styles[this.props.selected && this.props.editing ? 
                'remove-tag-button' : 'hidden']}
              onClick={() => signals.removeTagButtonClicked({})}
            />
            {tag}
        </div>);
      });
*/
      var options = [];
///////////
//      Object.keys(this.props.allTags).filter((tag) => {
//        return 

///////////
      Object.keys(this.props.allTags).forEach((tag) => {
        if (self.props.tags.indexOf(tag) < 0) {
          options.push(<option key={uuid.v4()} value={tag}>{tag} </option>);
        }
      });
      var id = uuid.v4();
  
      return (
        <div
          className={styles['editTagsBar']}>
          <datalist id={id}>
            {options}
          </datalist>
          <input 
            className={styles[this.props.editing && this.props.selected ? 
              'input' : 'hidden']}
            placeholder='Add a new tag'
            list={id}
            autoComplete='on'
            onKeyDown={this.handleKeyDown}
          />
          {this.props.tags.map(tag => 
          <div 
            key={tag} 
            className={styles["tag"]}>
            <FontAwesome 
              name='times'
              size='lg'
              className={styles[this.props.selected && this.props.editing ? 
                'remove-tag-button' : 'hidden']}
              onClick={() => this.props.tagRemoved({tag})}
            />
            {tag}
          </div>)}
        </div>
      )
    }
  }
) 
