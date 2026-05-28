import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, Download, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { invoicesApi } from '../api/invoices';

export default function InvoiceDetailScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoicesApi.getInvoice(id);
      if (res.success) {
        setInvoice(res.data);
      } else {
        setError(res.error?.message || t('common.error', 'An error occurred'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInvoice();
  }, [fetchInvoice]);

  const handleResend = async () => {
    setResending(true);
    setResendSuccess(false);
    try {
      const res = await invoicesApi.resendInvoice(id);
      if (res.success) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 3000);
      } else {
        alert(res.error?.message || t('common.error', 'Failed to resend'));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setResending(false);
    }
  };

  if (loading && !invoice) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-xl max-w-2xl mx-auto flex flex-col items-center gap-4">
        <p>{error}</p>
        <Link to="/pos" className="text-primary hover:underline">
          {t('common.back', 'Go back')}
        </Link>
      </div>
    );
  }

  if (!invoice) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Sent</span>;
      case 'failed':
        return <span className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded-full flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Failed</span>;
      case 'pending':
      case 'generated':
      default:
        return <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">Generated</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="p-2 hover:bg-secondary rounded-md transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold">{t('invoices.title', 'Invoice Details')}</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-muted-foreground text-sm font-mono">{invoice.invoiceNumber || id}</p>
              {getStatusBadge(invoice.status)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors disabled:opacity-50"
          >
            {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {resendSuccess ? t('invoices.resent', 'Resent!') : t('invoices.resend', 'Resend')}
          </button>
          
          {invoice.pdfUrl && (
            <a
              href={invoice.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
            >
              <Download className="w-4 h-4" />
              {t('invoices.download', 'Download PDF')}
            </a>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-xl p-6">
        {/* Placeholder for invoice metadata - backend response structure determines exact fields */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-6 pb-6 border-b">
          <div>
            <p className="text-muted-foreground">{t('common.date', 'Date')}</p>
            <p className="font-medium">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleString() : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('common.amount', 'Amount')}</p>
            <p className="font-medium text-lg">{(invoice.totalAmount || 0).toLocaleString()}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center p-12 bg-muted/30 border border-dashed rounded-lg">
           <p className="text-muted-foreground">
             {invoice.pdfUrl 
               ? t('invoices.previewAvailable', 'Click download to view the full PDF invoice.') 
               : t('invoices.noPdf', 'PDF generation is pending or failed.')}
           </p>
        </div>
      </div>
    </div>
  );
}
