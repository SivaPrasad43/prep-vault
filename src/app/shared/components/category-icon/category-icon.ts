import { Component, input } from '@angular/core';
import { LucideBookOpen, LucideBuilding, LucideCode2, LucideLanguages, LucideLayers, LucidePin, LucideTarget, LucideFolder } from '@lucide/angular';

@Component({
  selector: 'app-category-icon',
  imports: [LucideBookOpen, LucideBuilding, LucideCode2, LucideLanguages, LucideLayers, LucidePin, LucideTarget, LucideFolder],
  template: `
    @switch (icon()) {
      @case ('languages') { <svg lucideLanguages></svg> }
      @case ('code-2') { <svg lucideCode2></svg> }
      @case ('layers') { <svg lucideLayers></svg> }
      @case ('target') { <svg lucideTarget></svg> }
      @case ('building') { <svg lucideBuilding></svg> }
      @case ('book-open') { <svg lucideBookOpen></svg> }
      @case ('pin') { <svg lucidePin></svg> }
      @default { <svg lucideFolder></svg> }
    }
  `,
  host: { '[style.display]': '"inline-flex"', '[style.alignItems]': '"center"' },
})
export class CategoryIcon {
  readonly icon = input.required<string>();
}
