var drawFirstGeohashes = [
  getToken, {
    success: [storeToken, getFields, {
      success: [setFields, setNoteFields, {
        success: [],
        error: [],
      }],
      error: [], 
    },
    getAvailableYieldData, {
      success: [setAvailableData],
      error: [],
    }], 
    error: [],
  },
];

