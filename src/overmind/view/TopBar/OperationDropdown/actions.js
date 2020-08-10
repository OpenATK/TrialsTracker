export default {
  onAdd({state, actions}) {
    const myState = state.view.TopBar.OperationDropdown;
    myState.open = false;
    return actions.view.Modals.NewOperation.open()
  },
  onChange({state}, {id}) {
    const myState = state.view.TopBar.OperationDropdown;
    myState.selected = id;
    myState.open = false;
  },
  onOpenChange({state}, {open}) {
    const myState = state.view.TopBar.OperationDropdown;
    myState.open = open;
  },
  onSearch({state}, {search}) {
    const myState = state.view.TopBar.OperationDropdown;
    myState.search = search;
  }
}
