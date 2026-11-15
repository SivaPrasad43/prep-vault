import { Component, DestroyRef, HostListener, PLATFORM_ID, afterNextRender, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight, lucidePenLine, lucideGauge, lucideRepeat, lucideCode, lucideCopy,
  lucideHighlighter, lucideFlame, lucideListTree, lucideSearch, lucideFolderPlus, lucideShare2, lucideSunMoon,
  lucideBriefcase, lucideGraduationCap, lucideShuffle, lucidePlus, lucideChevronDown, lucideShieldCheck,
  lucideSparkles, lucideCheck, lucideZap,
} from '@ng-icons/lucide';
import { CategoryIcon } from '../../shared/components/category-icon/category-icon';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { ThemeService } from '../../core/services/theme.service';

interface DemoNote {
  title: string;
  category: string;
  icon: string;
  color: string;
  level: 1 | 2 | 3;
  preview: string;
}

const LEVEL_COLORS = ['', 'var(--confidence-need-practice)', 'var(--confidence-getting-there)', 'var(--confidence-confident)'];

/** Public landing page at `/` (prerendered). Signed-in users are redirected by landingGuard. */
@Component({
  selector: 'app-landing',
  imports: [RouterLink, NgIcon, CategoryIcon, RevealDirective],
  templateUrl: './landing.html',
  viewProviders: [
    provideIcons({
      lucideArrowRight, lucidePenLine, lucideGauge, lucideRepeat, lucideCode, lucideCopy,
      lucideHighlighter, lucideFlame, lucideListTree, lucideSearch, lucideFolderPlus, lucideShare2, lucideSunMoon,
      lucideBriefcase, lucideGraduationCap, lucideShuffle, lucidePlus, lucideChevronDown, lucideShieldCheck,
      lucideSparkles, lucideCheck, lucideZap,
    }),
  ],
})
export class Landing {
  private theme = inject(ThemeService);
  private destroyRef = inject(DestroyRef);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly year = new Date().getFullYear();
  /** Header turns solid once the hero is scrolled past. */
  protected readonly scrolled = signal(false);
  /** Note highlighted in the hero demo (auto-cycles). */
  protected readonly active = signal(0);
  private paused = false;

  protected readonly levelColor = LEVEL_COLORS;

  protected readonly demoNotes: DemoNote[] = [
    { title: 'CAP theorem', category: 'System Design', icon: 'layers', color: '#f59e0b', level: 1, preview: 'Pick two of consistency, availability, partition tolerance…' },
    { title: 'Go: goroutines & channels', category: 'Languages', icon: 'languages', color: '#4f6ef7', level: 2, preview: 'Unbuffered channels block until both sides are ready…' },
    { title: 'Two pointers pattern', category: 'Coding', icon: 'code-2', color: '#16a34a', level: 3, preview: 'Shrink the window from both ends while the sum is…' },
  ];

  protected readonly topics = [
    'System Design', 'Data Structures', 'Algorithms', 'Go', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Node.js',
    'SQL', 'Kubernetes', 'Docker', 'Networking', 'Operating Systems', 'Behavioural', 'Python', 'Java', 'Rust',
  ];

  protected readonly steps = [
    { icon: 'lucidePenLine', title: 'Write it down', text: 'Capture concepts the way you think: headings, lists, code with syntax highlighting, and neon highlights for the bits that matter.' },
    { icon: 'lucideGauge', title: 'Rate your confidence', text: 'Mark each topic Need practice, Getting there or Confident. Honest ratings turn a pile of notes into a study plan.' },
    { icon: 'lucideRepeat', title: 'Revise what’s weakest', text: 'Review next surfaces weak, long-untouched topics first. Mark them revised, keep your streak, and watch the gaps close.' },
  ];

  protected readonly smallFeatures = [
    { icon: 'lucideCode', title: 'Code that reads like code', text: 'Syntax highlighting for 20+ languages and one-click copy.' },
    { icon: 'lucideSearch', title: 'Find & contents', text: 'Ctrl+F inside a note and a collapsible outline for long topics.' },
    { icon: 'lucideFolderPlus', title: 'Your categories', text: 'Create categories with icons for any stack you’re prepping.' },
    { icon: 'lucideShare2', title: 'Share read-only links', text: 'Send a note to a mentor or friend, no sign-up needed.' },
  ];

  protected readonly personas = [
    { icon: 'lucideBriefcase', title: 'Job seekers', text: 'Keep every company’s question bank, your STAR stories and system-design drills in one place, and walk into each round revised.', example: '“Design a URL shortener” · Need practice' },
    { icon: 'lucideGraduationCap', title: 'CS students', text: 'Turn lecture notes and LeetCode patterns into a revision schedule that actually sticks before placement season.', example: '“Sliding window” · Getting there' },
    { icon: 'lucideShuffle', title: 'Engineers switching stacks', text: 'Moving from Java to Go or backend to frontend? Track the idioms you’ve nailed and the ones that still trip you up.', example: '“Go interfaces vs Java” · Confident' },
  ];

  protected readonly faqs = [
    { q: 'Is PrepDay free?', a: 'Yes. Sign in with Google and start writing. There’s no credit card and no trial timer.' },
    { q: 'Is my data private?', a: 'Your notes are private to your account. Nobody else can see them unless you create a share link for a specific note, and you can turn that link off any time.' },
    { q: 'Do I need an account?', a: 'You sign in with your Google account, so there’s no new password to remember. People you share a note with don’t need an account to read it.' },
    { q: 'Can I share notes?', a: 'Yes. Any note can get a read-only link that always shows the latest version. Reset or stop sharing whenever you like.' },
    { q: 'Does it work on mobile?', a: 'PrepDay is fully responsive, so you can review on your phone on the way to the interview.' },
    { q: 'Can I export my notes?', a: 'Notes are stored as Markdown. Email support and we’ll send you an export of everything.' },
  ];

  constructor() {
    const meta = inject(Meta);
    inject(Title).setTitle('PrepDay · Interview prep, one day at a time');
    meta.updateTag({ name: 'description', content: 'Write, rate and revise your interview prep notes. PrepDay shows what to revise next, tracks your streak and keeps code, highlights and topics organised. Free.' });
    meta.updateTag({ property: 'og:title', content: 'PrepDay · Interview prep, one day at a time' });
    meta.updateTag({ property: 'og:description', content: 'Write, rate and revise your interview prep notes, one day at a time.' });

    // The landing page is always light, whatever theme the app is set to.
    const html = inject(DOCUMENT).documentElement;
    if (this.isBrowser) {
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
      this.destroyRef.onDestroy(() => {
        html.classList.toggle('dark', this.theme.isDark());
        html.style.colorScheme = this.theme.isDark() ? 'dark' : 'light';
      });
    }

    afterNextRender(() => {
      this.onScroll();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const id = setInterval(() => {
        if (!this.paused) this.active.update((i) => (i + 1) % this.demoNotes.length);
      }, 3200);
      this.destroyRef.onDestroy(() => clearInterval(id));
    });
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    if (this.isBrowser) this.scrolled.set(window.scrollY > 40);
  }

  protected pauseDemo(paused: boolean): void {
    this.paused = paused;
  }

  protected scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
