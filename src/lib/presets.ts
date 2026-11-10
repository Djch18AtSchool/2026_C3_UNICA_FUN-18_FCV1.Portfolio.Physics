/** A named set of control values with its source, shown as a button by the Presets control. */
export interface Preset<T> {
  id: string;
  name: string;
  values: T;
  sourceLabel?: string;
  /** Where the source can be read: LabPresets prints sourceLabel as a link to it. */
  sourceUrl?: string;
  note?: string;
  /**
   * Plain text for a native <option> (LabPresets shows more than four presets as a select), which
   * cannot hold KaTeX: required when `name` has `$…$`.
   */
  optionLabel?: string;
}
