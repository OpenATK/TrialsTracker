function updateTagsList({state}) {
  _.each(state.get(['app', 'model', 'notes']), function(note) {
    _.each(note.tags, function(tag) {
      if (!_.includes(state.get(['app','model', 'tags']),tag)) {
        state.set(['app', 'model', 'tags', tag], {
          text: tag,
          references: 1,
        });
      } else {
        var refs = state.get(['app', 'model', 'tags', tag, 'references']);
        state.set(['app', 'model', 'tags', tag, 'references'], refs++);
      }
    });
  });
};

