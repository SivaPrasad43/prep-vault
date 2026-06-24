import { Component } from '@angular/core';
import { Skeleton } from '../../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-detail-skeleton',
  imports: [Skeleton],
  template: `
    <div class="detail-skeleton">
      <div class="detail-skeleton__topbar">
        <app-skeleton width="160px" height="16px" borderRadius="var(--radius-sm)" />
        <div class="detail-skeleton__actions">
          <app-skeleton width="70px" height="32px" borderRadius="var(--radius-sm)" />
          <app-skeleton width="80px" height="32px" borderRadius="var(--radius-sm)" />
        </div>
      </div>

      <div class="detail-skeleton__card">
        <div class="detail-skeleton__meta">
          <app-skeleton width="90px" height="22px" borderRadius="var(--radius-full)" />
          <app-skeleton width="60px" height="22px" borderRadius="var(--radius-full)" />
        </div>

        <app-skeleton width="140px" height="12px" borderRadius="var(--radius-sm)" />

        <app-skeleton width="70%" height="28px" borderRadius="var(--radius-sm)" />

        <div class="detail-skeleton__content">
          <app-skeleton width="100%" height="14px" borderRadius="var(--radius-sm)" />
          <app-skeleton width="95%" height="14px" borderRadius="var(--radius-sm)" />
          <app-skeleton width="88%" height="14px" borderRadius="var(--radius-sm)" />
          <app-skeleton width="60%" height="14px" borderRadius="var(--radius-sm)" />
        </div>

        <div class="detail-skeleton__code">
          <app-skeleton width="120px" height="36px" borderRadius="var(--radius-md) var(--radius-md) 0 0" />
          <app-skeleton width="100%" height="100px" borderRadius="0 0 var(--radius-md) var(--radius-md)" />
        </div>

        <div class="detail-skeleton__footer">
          <app-skeleton width="160px" height="12px" borderRadius="var(--radius-sm)" />
        </div>
      </div>
    </div>
  `,
  styles: `
    .detail-skeleton {
      max-width: 990px;
      margin: 0 auto;
      width: 100%;
    }

    .detail-skeleton__topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-lg);
    }

    .detail-skeleton__actions {
      display: flex;
      gap: var(--spacing-xs);
    }

    .detail-skeleton__card {
      padding: var(--spacing-xl) 0;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .detail-skeleton__meta {
      display: flex;
      gap: var(--spacing-sm);
    }

    .detail-skeleton__pills {
      display: flex;
      gap: var(--spacing-sm);
    }

    .detail-skeleton__content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-skeleton__code {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .detail-skeleton__footer {
      margin-top: var(--spacing-lg);
      padding-top: var(--spacing-md);
      border-top: 1px solid var(--color-border-light);
    }
  `,
})
export class DetailSkeleton {}
