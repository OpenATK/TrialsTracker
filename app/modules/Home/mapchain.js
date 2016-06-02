import * as _ from 'lodash';

var mouse_up_flag = false;
var mouse_down_flag = false;

export var dropPoint = [
 dropPointFunc 
];

export var mouseMoveOnmap = [
	mapMouseMove
];

export var mouseUpOnmap = [
	mapMouseUp
];

export var ToggleMap = [
	dragMapToggle
];

export var drawOnMap = [
	drawOnMapp
];

function dropPointFunc ({input, state}) {
	if(state.get(['home', 'view', 'drawMode']) === true){
		//console.log('mapMouseDown drop a point');
		//console.log(input);
		//console.log(state.get());
	
		mouse_up_flag = false;
		var vertex = [input.vertex_value.lng, input.vertex_value.lat];
		var currentSelectedNoteId = input.select_note;
		//console.log(vertex);
		//console.log(currentSelectedNoteId);
		
		_.each(state.get(['home', 'model', 'notes']), function(note) {
			//console.log('note.id and selectedNote');
			//console.log(note.id);	
			if(note.id === currentSelectedNoteId){
				//console.log(note.id);
				//console.log(state.get(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates', '0', '0']));
				//console.log(vertex);
				//console.log('before push');

			//state.select(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates', '0', '0']).push(vertex);
				state.push(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates', '0', '0'], vertex);
				//console.log('after push');
				//console.log(state.get(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates']));
			}
		});
	
		mouse_down_flag = true;
	}
};

function mapMouseMove ({input, state}) {
	//console.log('mapMouseMove signal');
	if(state.get(['home', 'view', 'drawMode']) === true){
		//console.log(input);
		//console.log('mouse_down_flag is');
		//console.log(mouse_down_flag);
		//console.log('mouse_up_flag is');
		//console.log(mouse_up_flag);
	
		var vertex = [input.vertex_value.lng, input.vertex_value.lat];
		var currentSelectedNoteId = input.selected_note;
		//console.log(vertex);
		//console.log(currentSelectedNoteId);

		if(mouse_up_flag === true){
			mouse_down_flag = false;
		}
	
		if(mouse_down_flag === true){
			_.each(state.get(['home', 'model', 'notes']), function(note) {
				if(note.id === currentSelectedNoteId){
					//console.log(note.id);
					//console.log(state.get(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates', '0', '0']));
					//console.log(vertex);
					//console.log('before update new position');
				
					var coor_array = state.get(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates', '0', '0']);
					var coor_arr_length = coor_array.length;
					//console.log(coor_array);
					//console.log(coor_arr_length);

					state.set(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates', '0', '0', (coor_arr_length-1)], vertex);

					//console.log('after update');
					//console.log(state.get(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates']));
				}
			});
		}
	}
};

function mapMouseUp ({input, state}) {
	if(state.get(['home', 'view', 'drawMode']) === true){
		//console.log('mouse up!');
		mouse_up_flag = true;
	}
};


function dragMapToggle ({state}) {
	//console.log('dragMapToggle');
	//console.log(state.get(['home', 'view', 'drag']));
	if (state.get(['home', 'view', 'drag'])) {
		state.set(['home', 'view', 'drag'], false);
	} else {
		state.set(['home', 'view', 'drag'], true);
	}
	
	//console.log(state.get(['home', 'view', 'drag']));
}

function drawOnMapp ({state}) {
	//console.log('draw on map function called');
	//console.log(state.get(['home', 'view', 'drawMode']));
	if(state.get(['home', 'view', 'drawMode']) === false){
		state.set(['home', 'view', 'drawMode'], true);
	}else{
		state.set(['home', 'view', 'drawMode'], false);
	}
	//console.log(state.get(['home', 'view', 'drawMode']));
}

