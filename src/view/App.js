import React from 'react';
import './App.css';

import Login from './Login'
import Map from './Map'
//import MenuBar from './MenuBar'
import NoteList from './NoteList'

import overmind from '../overmind'

function App() {
  const { state } = overmind();

  if (!state.view.Login.loggedIn) {
    return <Login />
  }

  return (
    <div className="App">
      <Map />
      <NoteList />
    </div>
  );
}

export default App;
