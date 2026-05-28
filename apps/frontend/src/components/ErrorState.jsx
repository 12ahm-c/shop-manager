import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ErrorState({ 
  message, 
  onRetry 
}) {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] h-full w-full bg-destructive/5 rounded-lg border border-destructive/20">
      <AlertTriangle className="w-10 h-10 text-destructive mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {t('common.error')}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {message || 'An unexpected error occurred while fetching data.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-md shadow-sm text-sm font-medium hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t('common.retry', 'Retry')}</span>
        </button>
      )}
    </div>
  );
}
