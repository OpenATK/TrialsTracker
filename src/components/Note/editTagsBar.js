import React, { PropTypes } from 'react';
import { connect } from 'cerebral-view-react';
import uuid from 'uuid';
import styles from './editTagsBar.css'
import fastyles from '../css/font-awesome.min.css';
import FontAwesome from 'react-fontawesome';

export default connect(props => ({
  tags: `app.model.notes.${props.id}.tags`,
  allTags: 'app.model.tags',
}), {
  tagAdded: 'app.tagAdded',
  removeTagButtonClicked: 'app.removeTagButtonClicked',
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
      (this.props.tags).forEach((tag) => {
        tags.push(<div 
          key={uuid.v4()} 
          className={styles["tag"]}>
            <FontAwesome 
              name='times'
              size='lg'
              className={styles[this.props.selected ? 'remove-tag-button' : 'hidden']}
              onClick={() => signals.removeTagButtonClicked({})}
            />
            {tag}
        </div>);
      });
  /*
      var editTagsButton = (this.props.selected) ? 
        <FontAwesome 
          name='tags'
          size='2x'
          className={styles['edit-tags-button']}
          onClick={() => signals.deleteNoteButtonClicked({id:this.props.id})}
        /> : null;
  */
      var options = [];
      Object.keys(this.props.allTags).forEach((tag) => {
        if (self.props.tags.indexOf(tag) < 0) {
          options.push(<option key={uuid.v4()} value={tag}>{tag} </option>);
        }
      });
      var id = uuid.v4();
  
      return (
        <div className={styles['editTagsBar']} >
          <datalist id={id}>
            {options}
          </datalist>
          <hr 
             noshade
             className={styles[this.props.selected ? 'hr' : 'hidden']}
          />
          <input 
            className={styles[this.props.selected ? 'input' : 'hidden']}
            placeholder='Add a new tag'
            list={id}
            autoComplete='on'
            onKeyDown={this.handleKeyDown}
          />
          {tags}
        </div>
      )
    }
  }
) 
