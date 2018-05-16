const geohashNoteIndex = {};

const geohashNoteIndexManager = {
	set: (geohash, noteId) => { 
		geohashNoteIndex[geohash] = geohashNoteIndex[geohash] || [];
		geohashNoteIndex[geohash].push(noteId);
	},

	get: (geohash) => geohashNoteIndex[geohash],

	remove: (geohash) => delete geohashNoteIndex[geohash],
};
Object.freeze(geohashNoteIndexManager);
export default geohashNoteIndexManager;
