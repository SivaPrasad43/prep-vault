import {
  ZardDialogCloseDirective,
  ZardDialogComponent,
  ZardDialogDescriptionComponent,
  ZardDialogFooterComponent,
  ZardDialogHeaderComponent,
  ZardDialogTitleComponent,
} from '@/shared/ui/dialog/dialog.component';

/** Every part of the declarative dialog, for a template that composes one. */
export const ZardDialogImports = [
  ZardDialogComponent,
  ZardDialogHeaderComponent,
  ZardDialogTitleComponent,
  ZardDialogDescriptionComponent,
  ZardDialogFooterComponent,
  ZardDialogCloseDirective,
] as const;
