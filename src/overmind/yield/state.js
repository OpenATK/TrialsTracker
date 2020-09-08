export default {
  cropLayers: {},
  geohashPolygons: {},
  index: {},
  tilesOnScreen: {},
  legends: {
        corn: [{
          value: 130,
          color: {
            r: 255,
            g: 0,
            b: 0, 
            alpha: 255,
          },
        },{
          value: ((225-130)/2)+130,
          color: {
            r: 255,
            g: 255,
            b: 0,
            alpha: 255,
          },
        },{ 
          value: 225,
          color: {
            r: 0,
            g: 255,
            b: 0,
            alpha: 255,
          },
        }],

        soybeans: [{ 
          value: 30,
          color: { 
            r: 255,
            g: 0,
            b: 0,
            alpha: 255,
          },
        },{
          value: ((65-30)/2)+30,
          color: {
            r: 255,
            g: 255,
            b: 0,
            alpha: 255,
          }, 
        },{
          value: 65,
          color: {
            r: 0,
            g: 255,
            b: 0,
            alpha: 255,
          },
        }],
        wheat: [{ 
          value: 40,
          color: { 
            r: 255,
            g: 0,
            b: 0,
            alpha: 255,
          },
        },{
          value: ((80-40)/2)+40,
          color: {
            r: 255,
            g: 255,
            b: 0,
            alpha: 255,
          }, 
        },{
          value: 80,
          color: {
            r: 0,
            g: 255,
            b: 0,
            alpha: 255,
          },
        }],
      },

}
