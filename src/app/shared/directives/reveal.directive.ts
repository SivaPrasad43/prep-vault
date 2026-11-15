import { Directive, ElementRef, OnDestroy, PLATFORM_ID, afterNextRender, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Fade/slide an element in when it scrolls into view. Server-rendered HTML stays
 * fully visible; elements already on screen at load, or with reduced motion, are
 * shown immediately. Styles live in styles.css ([data-reveal]).
 */
@Directive({ selector: '[appReveal]' })
export class RevealDirective implements OnDestroy {
  /** Optional stagger delay in ms. */
  readonly appReveal = input<number | string>('');
  private io?: IntersectionObserver;

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    afterNextRender(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const rect = el.getBoundingClientRect();
      if (reduce || typeof IntersectionObserver === 'undefined' || rect.top < window.innerHeight) return;
      const delay = Number(this.appReveal()) || 0;
      if (delay) el.style.transitionDelay = `${delay}ms`;
      el.setAttribute('data-reveal', 'hidden');
      this.io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            el.setAttribute('data-reveal', 'shown');
            this.io?.disconnect();
          }
        },
        { rootMargin: '0px 0px -10% 0px' },
      );
      this.io.observe(el);
    });
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
  }
}
