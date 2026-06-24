import { Component } from '@angular/core';
import { Skeleton } from '../../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-form-skeleton',
  imports: [Skeleton],
  template: `
    <div class="form-skeleton">
      <div class="form-skeleton__layout">
        <div class="form-skeleton__main">
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
            <div class="form-skeleton__block">
              <div class="form-skeleton__block-bar">
                <app-skeleton width="60px" height="16px" borderRadius="var(--radius-sm)" />
              </div>
              <app-skeleton width="100%" height="100px" borderRadius="0 0 var(--radius-md) var(--radius-md)" />
            </div>
          </div>
        </div>

        <div class="form-skeleton__sidebar">
          <div class="form-skeleton__confidence-card">
            <div class="form-skeleton__confidence-header">
              <app-skeleton width="16px" height="16px" borderRadius="4px" />
              <app-skeleton width="100px" height="14px" borderRadius="var(--radius-sm)" />
            </div>
            <app-skeleton width="140px" height="12px" borderRadius="var(--radius-sm)" />
            <div class="form-skeleton__confidence-items">
              <app-skeleton width="100%" height="38px" borderRadius="var(--radius-md)" />
              <app-skeleton width="100%" height="38px" borderRadius="var(--radius-md)" />
              <app-skeleton width="100%" height="38px" borderRadius="var(--radius-md)" />
            </div>
          </div>
        </div>
      </div>

      <div class="form-skeleton__sticky">
        <div class="form-skeleton__actions">
          <app-skeleton width="80px" height="38px" borderRadius="var(--radius-sm)" />
          <app-skeleton width="100px" height="38px" borderRadius="var(--radius-sm)" />
        </div>
      </div>
    </div>
  `,
  styles: `
    .form-skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .form-skeleton__layout {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: var(--spacing-xl);
      align-items: start;
    }

    .form-skeleton__main {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .form-skeleton__sidebar {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .form-skeleton__confidence-card {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .form-skeleton__confidence-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .form-skeleton__confidence-items {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
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

    .form-skeleton__sticky {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 40;
      background: var(--color-background);
      padding: var(--spacing-md) var(--spacing-xl);
      border-top: 1px solid var(--color-border);
    }

    .form-skeleton__actions {
      display: flex;
      gap: var(--spacing-sm);
      justify-content: flex-end;
      max-width: 990px;
      margin: 0 auto;
      width: 100%;
    }

    @media (max-width: 768px) {
      .form-skeleton__layout {
        grid-template-columns: 1fr;
      }

      .form-skeleton__sidebar {
        order: -1;
      }

      .form-skeleton__confidence-items {
        flex-direction: row;
      }
    }
  `,
})
export class FormSkeleton {}
