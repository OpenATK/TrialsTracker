const tiles = {};

const tileManager = {
	set: (key, value) => { 
		tiles[key] = value;
	},

	get: (key) => tiles[key],

	remove: (key) => delete tiles[key],
};
Object.freeze(tileManager);
export default tileManager;
