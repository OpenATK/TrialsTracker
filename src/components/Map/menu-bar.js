var React = require('react');
var ReactDOM = require('react-dom');
var Baobab = require('baobab');
var branch = require('baobab-react/mixins').branch;
var uuid = require('uuid');
require('./menu-bar.css');
     
var _MenuBar = React.createClass({

  mixins: [branch],
  
  addField: function() {
    console.log("Adding new field");
  },

  importYieldData: function() {
    console.log("Importing yield data");
  }, 

  showOverflowMenu: function() {
    console.log("showing overflow menu");
  }, 

  render: function() {
    return (
      <div id='menu-bar'>
        <button type="button" className='menu-button' onClick={this.addField}>New Field</button>
        <button type="button" className='menu-button' onClick={this.showOverflowMenu}>Overflow Menu</button>
        <button type="button" className='menu-button' onClick={this.importYieldData}>Import Yield Data</button>
      </div>
    );
  }
});
module.exports = _MenuBar
