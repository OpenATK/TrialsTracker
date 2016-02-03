import React, { PropTypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
require('./sorting-tabs.css');

class SortingTabs extends React.Component {

  static propTypes = {
  
  };

  render() {

    return ( 
      <div className="sorting-tabs">
      <button type="button" className="tab-button">
        All
      </button>
      <button type="button" className="tab-button">
        Fields
      </button>
      <button type="button" className="tab-button">
        Tags
      </button> 
      </div>
    );
  }
}
export default SortingTabs;
