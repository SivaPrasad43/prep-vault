export interface SelectOption {
  value: string;
  label: string;
  /** Category icon key (see CategoryIcon) shown before the label. */
  icon?: string;
  /** Accent color for the icon / dot. */
  color?: string;
  /** Show a colored dot instead of an icon. */
  dot?: boolean;
  /** Small muted text after the label. */
  hint?: string;
}
