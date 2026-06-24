import { Component } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

@Component({
  selector: 'app-skeleton-card',
  imports: [Skeleton],
  template: `
    <div class="skeleton-card">
      <div class="skeleton-card__top">
        <div class="skeleton-card__meta">
          <app-skeleton width="80px" height="22px" borderRadius="var(--radius-full)" />
          <app-skeleton width="60px" height="22px" borderRadius="var(--radius-full)" />
        </div>
        <div class="skeleton-card__actions">
          <app-skeleton width="20px" height="20px" borderRadius="4px" />
        </div>
      </div>
      <app-skeleton width="65%" height="20px" borderRadius="var(--radius-sm)" />
      <div class="skeleton-card__lines">
        <app-skeleton width="100%" height="12px" borderRadius="var(--radius-sm)" />
        <app-skeleton width="80%" height="12px" borderRadius="var(--radius-sm)" />
      </div>
      <div class="skeleton-card__footer">
        <app-skeleton width="100px" height="12px" borderRadius="var(--radius-sm)" />
      </div>
    </div>
  `,
  styles: `
    .skeleton-card {
      padding: var(--spacing-lg) 0;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .skeleton-card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .skeleton-card__meta {
      display: flex;
      gap: var(--spacing-sm);
    }

    .skeleton-card__actions {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .skeleton-card__lines {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .skeleton-card__footer {
      margin-top: var(--spacing-xs);
      padding-top: var(--spacing-sm);
      border-top: 1px solid var(--color-border-light);
    }
  `,
})
export class SkeletonCard {}
