function addTagToAllTagsList({input, state}) {
  var allTags = state.get(['app', 'model', 'tags']);
  if (!allTags[input.text]) {
    state.set(['app', 'model', 'tags', input.text], { 
      text: input.text,
      references: 1
    });
  } else {
    state.set(['app', 'model', 'tags', input.text, 'references'], allTags[input.text].references+1);
  }
};


