import { Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBookOpen, lucideBuilding, lucideCode, lucideLanguages, lucideLayers, lucidePin, lucideTarget, lucideFolder,
  lucideBrain, lucideDatabase, lucideServer, lucideCloud, lucideCpu, lucideGlobe, lucideShield, lucideTerminal,
  lucideGitBranch, lucideBriefcase, lucideUsers, lucideMessageSquare, lucideLightbulb, lucideRocket, lucideStar,
  lucideCalculator, lucideNetwork, lucideBox, lucideSmartphone, lucidePalette,
} from '@ng-icons/lucide';

/** Icon keys a category can use (stored in `categories.icon`) → lucide icon names. */
export const CATEGORY_ICONS: Record<string, string> = {
  folder: 'lucideFolder',
  languages: 'lucideLanguages',
  'code-2': 'lucideCode',
  layers: 'lucideLayers',
  target: 'lucideTarget',
  building: 'lucideBuilding',
  'book-open': 'lucideBookOpen',
  pin: 'lucidePin',
  brain: 'lucideBrain',
  database: 'lucideDatabase',
  server: 'lucideServer',
  cloud: 'lucideCloud',
  cpu: 'lucideCpu',
  globe: 'lucideGlobe',
  shield: 'lucideShield',
  terminal: 'lucideTerminal',
  'git-branch': 'lucideGitBranch',
  network: 'lucideNetwork',
  box: 'lucideBox',
  smartphone: 'lucideSmartphone',
  palette: 'lucidePalette',
  calculator: 'lucideCalculator',
  briefcase: 'lucideBriefcase',
  users: 'lucideUsers',
  'message-square': 'lucideMessageSquare',
  lightbulb: 'lucideLightbulb',
  rocket: 'lucideRocket',
  star: 'lucideStar',
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

@Component({
  selector: 'app-category-icon',
  imports: [NgIcon],
  template: `<ng-icon [name]="name()" />`,
  viewProviders: [
    provideIcons({
      lucideBookOpen, lucideBuilding, lucideCode, lucideLanguages, lucideLayers, lucidePin, lucideTarget, lucideFolder,
      lucideBrain, lucideDatabase, lucideServer, lucideCloud, lucideCpu, lucideGlobe, lucideShield, lucideTerminal,
      lucideGitBranch, lucideBriefcase, lucideUsers, lucideMessageSquare, lucideLightbulb, lucideRocket, lucideStar,
      lucideCalculator, lucideNetwork, lucideBox, lucideSmartphone, lucidePalette,
    }),
  ],
  host: { class: 'inline-flex items-center' },
})
export class CategoryIcon {
  readonly icon = input.required<string>();
  protected readonly name = computed(() => CATEGORY_ICONS[this.icon()] ?? 'lucideFolder');
}
