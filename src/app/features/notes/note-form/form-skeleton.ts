import { Component } from '@angular/core';
import { Skeleton } from '../../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-form-skeleton',
  imports: [Skeleton],
  template: `
    <div class="form-skeleton">
      <div class="form-skeleton__field">
        <app-skeleton width="40px" height="14px" borderRadius="var(--radius-sm)" />
        <app-skeleton width="100%" height="42px" borderRadius="var(--radius-sm)" />
      </div>

      <div class="form-skeleton__field">
        <app-skeleton width="70px" height="14px" borderRadius="var(--radius-sm)" />
        <div class="form-skeleton__pills">
          <app-skeleton width="90px" height="32px" borderRadius="var(--radius-full)" />
          <app-skeleton width="80px" height="32px" borderRadius="var(--radius-full)" />
          <app-skeleton width="100px" height="32px" borderRadius="var(--radius-full)" />
          <app-skeleton width="70px" height="32px" borderRadius="var(--radius-full)" />
        </div>
      </div>

      <div class="form-skeleton__field">
        <app-skeleton width="60px" height="14px" borderRadius="var(--radius-sm)" />
        <div class="form-skeleton__block">
          <div class="form-skeleton__block-bar">
            <app-skeleton width="60px" height="16px" borderRadius="var(--radius-sm)" />
          </div>
          <app-skeleton width="100%" height="100px" borderRadius="0 0 var(--radius-md) var(--radius-md)" />
        </div>
      </div>

      <div class="form-skeleton__field">
        <app-skeleton width="100px" height="14px" borderRadius="var(--radius-sm)" />
        <div class="form-skeleton__pills">
          <app-skeleton width="110px" height="32px" borderRadius="var(--radius-full)" />
          <app-skeleton width="120px" height="32px" borderRadius="var(--radius-full)" />
          <app-skeleton width="100px" height="32px" borderRadius="var(--radius-full)" />
        </div>
      </div>

      <div class="form-skeleton__actions">
        <app-skeleton width="80px" height="38px" borderRadius="var(--radius-sm)" />
        <app-skeleton width="100px" height="38px" borderRadius="var(--radius-sm)" />
      </div>
    </div>
  `,
  styles: `
    .form-skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .form-skeleton__field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .form-skeleton__pills {
      display: flex;
      gap: var(--spacing-sm);
      flex-wrap: wrap;
    }

    .form-skeleton__block {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .form-skeleton__block-bar {
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--color-surface-hover);
      border-bottom: 1px solid var(--color-border);
    }

    .form-skeleton__actions {
      display: flex;
      gap: var(--spacing-sm);
      justify-content: flex-end;
      padding-top: var(--spacing-md);
      border-top: 1px solid var(--color-border-light);
    }
  `,
})
export class FormSkeleton {}
