import { Component } from '@angular/core';
import { Skeleton } from '../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-analytics-skeleton',
  imports: [Skeleton],
  template: `
    <div class="analytics-skeleton">
      <div class="analytics-skeleton__cards">
        <div class="analytics-skeleton__card">
          <app-skeleton width="22px" height="22px" borderRadius="var(--radius-sm)" />
          <div class="analytics-skeleton__card-text">
            <app-skeleton width="32px" height="20px" borderRadius="var(--radius-sm)" />
            <app-skeleton width="60px" height="10px" borderRadius="var(--radius-sm)" />
          </div>
        </div>
        <div class="analytics-skeleton__card">
          <app-skeleton width="22px" height="22px" borderRadius="var(--radius-sm)" />
          <div class="analytics-skeleton__card-text">
            <app-skeleton width="24px" height="20px" borderRadius="var(--radius-sm)" />
            <app-skeleton width="60px" height="10px" borderRadius="var(--radius-sm)" />
          </div>
        </div>
        <div class="analytics-skeleton__card">
          <app-skeleton width="22px" height="22px" borderRadius="var(--radius-sm)" />
          <div class="analytics-skeleton__card-text">
            <app-skeleton width="20px" height="20px" borderRadius="var(--radius-sm)" />
            <app-skeleton width="40px" height="10px" borderRadius="var(--radius-sm)" />
          </div>
        </div>
        <div class="analytics-skeleton__card">
          <app-skeleton width="22px" height="22px" borderRadius="var(--radius-sm)" />
          <div class="analytics-skeleton__card-text">
            <app-skeleton width="20px" height="20px" borderRadius="var(--radius-sm)" />
            <app-skeleton width="40px" height="10px" borderRadius="var(--radius-sm)" />
          </div>
        </div>
      </div>

      <div class="analytics-skeleton__chart">
        <div class="analytics-skeleton__chart-header">
          <app-skeleton width="120px" height="16px" borderRadius="var(--radius-sm)" />
        </div>
        <div class="analytics-skeleton__chart-body">
          <app-skeleton width="100%" height="100%" borderRadius="var(--radius-sm)" />
        </div>
      </div>

      <div class="analytics-skeleton__grid">
        <div class="analytics-skeleton__chart">
          <div class="analytics-skeleton__chart-header">
            <app-skeleton width="90px" height="16px" borderRadius="var(--radius-sm)" />
          </div>
          <div class="analytics-skeleton__chart-body">
            <app-skeleton width="100%" height="100%" borderRadius="var(--radius-sm)" />
          </div>
        </div>
        <div class="analytics-skeleton__chart">
          <div class="analytics-skeleton__chart-header">
            <app-skeleton width="80px" height="16px" borderRadius="var(--radius-sm)" />
          </div>
          <div class="analytics-skeleton__chart-body">
            <app-skeleton width="100%" height="100%" borderRadius="var(--radius-sm)" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .analytics-skeleton {
      max-width: 900px;
      margin: 5rem auto;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .analytics-skeleton__cards {
      display: flex;
      gap: var(--spacing-md);
    }

    .analytics-skeleton__card {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md) var(--spacing-lg);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      flex: 1;
    }

    .analytics-skeleton__card-text {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .analytics-skeleton__chart {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .analytics-skeleton__chart-header {
      padding: var(--spacing-md) var(--spacing-lg);
      border-bottom: 1px solid var(--color-border-light);
    }

    .analytics-skeleton__chart-body {
      padding: var(--spacing-lg);
      height: 280px;
    }

    .analytics-skeleton__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-md);
    }

    .analytics-skeleton__grid .analytics-skeleton__chart-body {
      height: 240px;
    }

    @media (max-width: 480px) {
      .analytics-skeleton {
        margin: 1rem auto;
        padding: 0 var(--spacing-md);
      }

      .analytics-skeleton__cards {
        flex-wrap: wrap;
        gap: var(--spacing-sm);
      }

      .analytics-skeleton__card {
        min-width: calc(50% - var(--spacing-sm));
        padding: var(--spacing-sm);
      }

      .analytics-skeleton__grid {
        grid-template-columns: 1fr;
      }

      .analytics-skeleton__chart-body {
        height: 220px;
      }
    }
  `,
})
export class AnalyticsSkeleton {}
