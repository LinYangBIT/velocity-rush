export const KEY_CONTROLS = {
 ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right',
 ArrowDown:'brake', KeyS:'brake', ShiftLeft:'drift', ShiftRight:'drift'
};

// A control remains held until every finger/key that owns it is released.
export function createDrivingInput() {
 const sources = new Map();
 const state = {left:false, right:false, brake:false, drift:false};
 function refresh() {
  for (const control of Object.keys(state)) state[control] = [...sources.values()].includes(control);
 }
 return {
  state,
  press(source, control) {if (!(control in state)) return; sources.set(source, control); refresh();},
  release(source) {sources.delete(source); refresh();},
  reset() {sources.clear(); refresh();}
 };
}
