

var drawFirstGeohashes = [
  getToken, {
    success: [
      storeToken, 
      getFields, {
        success: [
          setFields, 
          computeFieldBoundingBoxes, {
            success: [setFieldBoundingBoxes],
            error: [],
          }
        ],
        error: [],
      }, 
      getAvailableYieldData, {
        success: [
          setAvailableData,
          computeFieldStats, {
            success: [
              setFieldStats,
              getFieldDataForNotes,
            ],
            error: [],
          }  
        ],
        error: [],
      }
    ], 
    error: [],
  },
];
