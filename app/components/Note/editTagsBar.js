import React, { PropTypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import uuid from 'uuid';
import styles from './editTagsBar.css'
import fastyles from '../css/font-awesome.min.css';
import FontAwesome from 'react-fontawesome';

@Cerebral((props) => {
  return {
    tags: ['home', 'model', 'notes', props.id, 'tags'],
    allTags: ['home', 'model', 'tags'],
  };
})

class EditTagsBar extends React.Component {
 
  static propTypes = {
    text: PropTypes.string,
    showHide: PropTypes.string,
  };

  componentWillMount() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  handleKeyDown(evt) {
    if (evt.keyCode == 13 || evt.keyCode == 9) {
      this.props.signals.home.tagAdded({text: evt.target.value});
    }
  }

  render() {
    const signals = this.props.signals.home;
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
    );
  }
}

export default EditTagsBar;
