/** A named set of control values with its source, shown as a button by the Presets control. */
export interface Preset<T> {
  id: string;
  name: string;
  values: T;
  sourceLabel?: string;
  note?: string;
}
