function checkTags ({input, state}) {
  var allTags = state.get(['app', 'model', 'tags']);
  var noteTags = state.get(['app', 'model', 'notes', input.id, 'tags']);
  noteTags.forEach((tag) => {
    console.log(allTags[tag]);
    console.log(allTags[tag].references <= 1);
    if (allTags[tag].references <= 1) {
      state.unset(['app', 'model', 'tags', tag]); 
    }
  })
}

