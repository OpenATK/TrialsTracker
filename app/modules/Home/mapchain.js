import * as _ from 'lodash';
export var dropPoint = [
 dropPointFunc 
];

export var mouseMoveOnmap = [
	mapMouseMove
];


function dropPointFunc ({input, state}) {
	console.log('mapMouseDown drop a point');
	console.log(input);
	console.log(state.get());
	
	var vertex = [input.vertex_value.lng, input.vertex_value.lat];
	var currentSelectedNoteId = input.select_note;
	console.log(vertex);
	console.log(currentSelectedNoteId);
		
	_.each(state.get(['home', 'model', 'notes']), function(note) {
		console.log('note.id and selectedNote');
		console.log(note.id);	
		if(note.id === currentSelectedNoteId){
			console.log(note.id);
			console.log(state.get(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates', '0', '0']));
			console.log(vertex);
			console.log('before push');

			//state.select(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates', '0', '0']).push(vertex);
			state.push(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates', '0', '0'], vertex);
			console.log('after push');
			console.log(state.get(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates']));
		}
	});

};

function mapMouseMove ({input, state}) {
	console.log('mapMouseMove signal');
	console.log(input);
																					 
};

