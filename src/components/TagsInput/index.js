import React, { PropTypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral/react';
import uuid from 'uuid';
require('./tags-input.css');

@Cerebral((props) => {
  return {
    note: ['home', 'model', 'notes', props.id],
    completions: ['home', 'model', 'notes', props.id, 'completions'],
    text: ['home', 'model', 'notes', props.id, 'text'],
  };
})

class TagsInput extends React.Component {

  static propTypes = {
    completions: PropTypes.arrayOf(PropTypes.string),
    text: PropTypes.string, 
  };

  render() {

    return (

      <div>
        <button type='button' onClick={() => signals.addTag()}/>
      </div>

    );
  }
}

export default TagsInput;

 
