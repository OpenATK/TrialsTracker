const tiles = {};

const tileManager = {
	set: (layer, key, value) => { 
		tiles[layer] = tiles[layer] || {};
		tiles[layer][key] = value;
	},

	get: (layer, key) => {
		if (tiles[layer]) return tiles[layer][key];
		return
	},

	remove: (layer, key) => delete tiles[layer][key],
};
Object.freeze(tileManager);
export default tileManager;
