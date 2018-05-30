import React from 'react';
import { connect } from '@cerebral/react';
import { Marker, FeatureGroup, LayersControl, GeoJSON } from 'react-leaflet';
import './map.css';
import RasterLayer from '../RasterLayer/index.js';
import {state, signal} from 'cerebral/tags'
import uuid from 'uuid'
const { Overlay } = LayersControl;

export default connect({
  cropLayers: state`map.crop_layers`,
	notes: state`notes.notes`,
	notesVisible: state`notes.visible`,
  selectedNote: state`notes.notes.${state`notes.selected_note`}`,
	editing: state`app.view.editing`,
  index: state`yield.index`,
  fields: state`notes.fields`,
  domain: state`Connections.oada_domain`,
	isLoading: state`map.isLoading`,
	geohashPolygons: state`map.geohashPolygons`,

	noteClicked: signal`notes.noteClicked`,
  toggleCropLayer: signal`map.toggleCropLayer`,
  toggleNotesVisible: signal`map.toggleNotesVisible`,
},

class LayerControl extends React.Component {

	render() {

		let notePolygons = Object.keys(this.props.notes).filter(id => 
			this.props.notes[id].geometry 
			&& this.props.notes[id].geometry.geojson 
			&& this.props.notes[id].geometry.geojson.coordinates[0].length > 0
		).map(id => {
			return <GeoJSON 
      className={'note-polygon'}
      data={this.props.notes[id].geometry.geojson} 
      color={this.props.notes[id].color} 
  	  style={{fillOpacity:0.4}}
	    onClick={() => this.props.noteClicked({id})}
      dragging={true} 
			key={'note-'+id+'-polygon'+uuid()} //TODO: don't do this
		/>})

    return (
      <LayersControl 
				position='topright'>
				{this.props.geohashPolygons.length ? <Overlay 
          name='Geohash Polygons'>
				  <FeatureGroup>
					  {this.props.geohashPolygons.map(polygon => <GeoJSON 
              className={'geohash-polygon'}
							data={polygon} 
							style={{fillOpacity:0.0, strokeWidth: 1}}                                  
              key={uuid.v4()}
					  />)}
         </FeatureGroup>
				</Overlay> : null }

				{Object.keys(this.props.fields || {}).length ? <Overlay 
          checked 
          name='Fields'>
				  <FeatureGroup>
					  {Object.keys(this.props.fields || {}).map(field => <GeoJSON 
							className={'field-polygon'}
							onClick={() => this.props.noteClicked({id:field, type: 'fields'})}
							color={this.props.fields[field].color} 
							style={{color: this.props.fields[field].color}}
              data={this.props.fields[field].geometry.geojson} 
              key={field}
					  />)}
         </FeatureGroup>
				</Overlay> : null }
				{Object.keys(this.props.index || {}).map(crop => 
					<Overlay 
          checked={this.props.cropLayers[crop].visible}
          onChange={()=>this.props.toggleCropLayer({crop})}
          name={crop.charAt(0).toUpperCase() + crop.slice(1)}
          key={crop+'-overlay'}>
          <RasterLayer
            key={'RasterLayer-'+crop}
            layer={crop}
            geohashGridlines={false}
            tileGridlines={false}
					/>
				</Overlay> : null )}
				<Overlay 
					checked={this.props.notesVisible}
					onChange={()=>this.props.toggleNotesVisible()}
					name='Notes'
					key={'notes-polygons'}>
				  <FeatureGroup>
						{ this.props.selectedNote
						&& this.props.selectedNote.geometry
						&& this.props.selectedNote.geometry.geojson ? 
						this.props.selectedNote.geometry.geojson.coordinates[0].map((pt, i) => 
							<Marker
								className={'selected-note-marker'}
								key={this.props.selectedNote+'-'+i} 
								position={[pt[1], pt[0]]}
								color={this.props.selectedNote.color}
								draggable={true}
								onDrag={(e)=>{this.props.markerDragged({type: 'notes', lat: e.target._latlng.lat, lng:e.target._latlng.lng, id:this.props.selectedNote.id})}}
								onDragStart={(e)=>{this.props.markerDragStarted({})}}
								onDragEnd={(e)=>{this.props.markerDragEnded({})}}
							/>
						) : null}
						{notePolygons}
					</FeatureGroup>
				</Overlay>
			</LayersControl>
    )
  }
})
