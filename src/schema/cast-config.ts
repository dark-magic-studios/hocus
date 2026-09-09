/** Custom cast definition stored at `.hocus/casts/<id>.json`. */
export interface CustomCastPersona {
  character: string;
  display_name: string;
}

export interface CustomCastConfig {
  /** Human-readable label shown in the TUI and CLI. */
  label: string;
  /**
   * Persona naming keyed by canonical valley slug (e.g. "richard", "gilfoyle").
   * Each entry defines the `character` slug, soul filename stem, skill prefix,
   * and `display_name` for that role in this cast.
   */
  personas: Record<string, CustomCastPersona>;
}
