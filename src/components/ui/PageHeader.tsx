import { memo, type ReactNode } from 'react';

interface PageHeaderProps {
  kicker: ReactNode;
  title: ReactNode;
  /** Optional right-aligned actions; wraps below the title on small screens. */
  actions?: ReactNode;
  className?: string;
}

/** Standard view heading (kicker + h1) shared by every top-level view. */
export const PageHeader = memo(function PageHeader({
  kicker,
  title,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#455D75] mb-1">{kicker}</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0F233A] break-words">
          {title}
        </h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
});
