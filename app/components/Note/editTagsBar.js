import React, { PropTypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import uuid from 'uuid';
import styles from './editTagsBar.css'

@Cerebral((props) => {
  return {
    tags: ['home', 'model', 'notes', props.id, 'tags'],
  };
})

class EditTagsBar extends React.Component {
 
  static propTypes = {
    text: PropTypes.string,
    showHide: PropTypes.string,
  };

  render() {
    const signals = this.props.signals.home;
    var tags = [];
    var self = this;
//        <button key={uuid.v4()} className={styles['remove-tag-button']} onClick={() => signals.removeTagButtonClicked({})}>X</button>
    _.each(this.props.tags, function(tag) {
      tags.push(<div key={uuid.v4()} className={styles["tag"]}>
        {tag}
        </div>);
    });

    return (
      <div className={styles['editTagsBar']} >
        {tags}
        <input className={styles['input']} />
      </div>
    );
  }
}

export default EditTagsBar;
