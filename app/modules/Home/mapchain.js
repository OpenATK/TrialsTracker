import * as _ from 'lodash';
export var dropPoint = [
 dropPointFunc 
];

export var mouseMoveOnmap = [
	mapMouseMove
];


function dropPointFunc ({input, state}) {
	
	var vertex = [input.vertex_value.lng, input.vertex_value.lat];
	var currentSelectedNoteId = input.select_note;
		
	_.each(state.get(['home', 'model', 'notes']), function(note) {
		if(note.id === currentSelectedNoteId){

			//state.select(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates', '0', '0']).push(vertex);
			state.push(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates', '0', '0'], vertex);
		}
	});

};

function mapMouseMove ({input, state}) {
																					 
};

