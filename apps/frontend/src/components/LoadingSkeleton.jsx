export default function LoadingSkeleton({ variant = 'card', count = 1 }) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'table-row':
        return (
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/3 bg-muted rounded animate-pulse"></div>
                <div className="h-3 w-1/4 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
            <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
          </div>
        );
      case 'text-block':
        return (
          <div className="space-y-3 w-full p-4">
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-5/6 bg-muted rounded animate-pulse"></div>
          </div>
        );
      case 'card':
      default:
        return (
          <div className="p-4 rounded-lg border border-border bg-card flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-muted animate-pulse"></div>
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
                <div className="h-3 w-1/3 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-muted rounded animate-pulse"></div>
              <div className="h-3 w-4/5 bg-muted rounded animate-pulse"></div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`w-full flex flex-col gap-2 ${variant === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-full">
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
}
