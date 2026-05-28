import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function EmptyState({ 
  icon: Icon = Inbox, 
  title, 
  description, 
  action 
}) {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] h-full w-full bg-card rounded-lg border border-dashed border-border">
      <div className="bg-secondary p-4 rounded-full mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {title || t('common.noResults')}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
}
