import PouchDB from 'pouchdb';
var singleton = null;

module.exports = () => {
  if (!singleton) singleton = new PouchDB('TrialsTracker', { size: 500});
  return singleton;
}

