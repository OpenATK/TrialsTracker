import React, { PropTypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import TextAreaAutoSize from 'react-textarea-autosize';
import uuid from 'uuid';
require('./note.css');

@Cerebral((props) => {
  return {
    text: ['home', 'model', 'notes', props.id, 'text'],
    tags: ['home', 'model', 'notes', props.id, 'tags'],
    showHide: ['home', 'model', 'notes', props.id, 'geojson_visible'],
  };
})

class Note extends React.Component {
 
  static propTypes = {
    text: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    showHide: PropTypes.string,
  };

  render() {
    var tags = [];
    _.each(this.props.tags, function(tag) {
      tags.push(<span className='tag' key={uuid.v4()}>{tag.text}</span>);
    });

    const signals = this.props.signals.app;

    return (
      <div className="note">
        <TextAreaAutoSize value={this.props.text} minRows={3} className='note-text-input'></TextAreaAutoSize>
        <button type="button" className="note-remove-button">
          Delete Note
        </button>
        <button type="button" className="note-edit-tags-button">
          Edit Tags
        </button>
        <button type="button" className="note-remove-button">
         {this.props.showHide} 
        </button>
        {tags}
      </div>
    );
  }
}

export default Note;

