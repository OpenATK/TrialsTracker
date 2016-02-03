export default [
  removeNote
];

function removeNote(args, state, output) {
  state.set('foo', args.value);
};

