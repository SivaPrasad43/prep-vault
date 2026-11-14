import {
  ZardSelectGroupComponent,
  ZardSelectLabelComponent,
  ZardSelectSeparatorComponent,
} from '@/shared/ui/select/select-group.component';
import { ZardSelectItemComponent } from '@/shared/ui/select/select-item.component';
import { ZardSelectComponent } from '@/shared/ui/select/select.component';

export const ZardSelectImports = [
  ZardSelectComponent,
  ZardSelectGroupComponent,
  ZardSelectItemComponent,
  ZardSelectLabelComponent,
  ZardSelectSeparatorComponent,
] as const;
