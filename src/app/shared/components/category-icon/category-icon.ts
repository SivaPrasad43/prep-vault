import { Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBookOpen, lucideBuilding, lucideCode, lucideLanguages, lucideLayers, lucidePin, lucideTarget, lucideFolder,
} from '@ng-icons/lucide';

const ICONS: Record<string, string> = {
  languages: 'lucideLanguages',
  'code-2': 'lucideCode',
  layers: 'lucideLayers',
  target: 'lucideTarget',
  building: 'lucideBuilding',
  'book-open': 'lucideBookOpen',
  pin: 'lucidePin',
};

@Component({
  selector: 'app-category-icon',
  imports: [NgIcon],
  template: `<ng-icon [name]="name()" />`,
  viewProviders: [
    provideIcons({ lucideBookOpen, lucideBuilding, lucideCode, lucideLanguages, lucideLayers, lucidePin, lucideTarget, lucideFolder }),
  ],
  host: { class: 'inline-flex items-center' },
})
export class CategoryIcon {
  readonly icon = input.required<string>();
  protected readonly name = computed(() => ICONS[this.icon()] ?? 'lucideFolder');
}
