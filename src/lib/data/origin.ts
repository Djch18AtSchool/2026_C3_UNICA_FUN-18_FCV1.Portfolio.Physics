/**
 * Model vs product (Global Constraints of the Final Delivery): where a parameter of a table, preset
 * or lab comes from. `producto` is a value published for the real product, structure,
 * specification or circuit, or the document's own; `ilustrativo` is a model assumption (a length I
 * chose, a handbook or software default); `calculo` is my own calculation from sourced values,
 * reproduced by tested code. One vocabulary for every data module; a module whose values can only
 * be some of these narrows it (`Exclude<ValueOrigin, …>`).
 */
export type ValueOrigin = 'producto' | 'ilustrativo' | 'calculo';
