'use client';

import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';

interface LoadingStateProps {
  message?: string | undefined;
  className?: string | undefined;
}

export function LoadingState({ message = 'Loading...', className = '' }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 py-12 text-foreground-secondary ${className}`}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

interface EmptyStateProps {
  title?: string | undefined;
  description?: string | undefined;
  icon?: React.ReactNode | undefined;
  action?: React.ReactNode | undefined;
  className?: string | undefined;
}

export function EmptyState({
  title = 'No results',
  description = 'There are no items to display.',
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-4 py-16 text-center ${className}`}
    >
      <div className="rounded-xl bg-muted p-4">
        {icon ?? <Inbox className="h-8 w-8 text-foreground-muted" aria-hidden="true" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="max-w-sm text-sm text-foreground-secondary">{description}</p>
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

interface ErrorStateProps {
  title?: string | undefined;
  message?: string | undefined;
  onRetry?: (() => void) | undefined;
  className?: string | undefined;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading data.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-4 py-16 text-center ${className}`}
    >
      <div className="rounded-xl bg-destructive/10 p-4">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="max-w-sm text-sm text-foreground-secondary">{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      ) : null}
    </div>
  );
}

interface DataViewProps<T> {
  data: T[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  loadingMessage?: string;
  children: (data: T[]) => React.ReactNode;
}

export function DataView<T>({
  data,
  isLoading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyAction,
  loadingMessage,
  children,
}: DataViewProps<T>) {
  if (isLoading) {
    return <LoadingState message={loadingMessage} />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return <>{children(data)}</>;
}
