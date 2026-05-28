import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileDown, Loader2, Calendar } from 'lucide-react';
import { reportsApi } from '../api/reports';

export default function ReportsScreen() {
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [reportType, setReportType] = useState('daily-cash');
  const [format, setFormat] = useState('pdf');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const reportTypes = [
    { id: 'daily-cash', label: t('reports.dailyCash', 'Daily Cash Report') },
    { id: 'profitability', label: t('reports.profitability', 'Profitability Report') },
    { id: 'top-products', label: t('reports.topProducts', 'Top Products Report') },
    { id: 'aging', label: t('reports.aging', 'Debt Aging Report') },
  ];

  const handleDownload = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const params = { format };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      let blob;
      switch (reportType) {
        case 'daily-cash':
          blob = await reportsApi.getDailyCash(params);
          break;
        case 'profitability':
          blob = await reportsApi.getProfitability(params);
          break;
        case 'top-products':
          blob = await reportsApi.getTopProducts(params);
          break;
        case 'aging':
          blob = await reportsApi.getAging(params);
          break;
        default:
          throw new Error('Unknown report type');
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      setError(err.message || t('common.error', 'An error occurred generating the report'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('reports.title', 'Reports')}</h2>
        <p className="text-muted-foreground">{t('reports.subtitle', 'Generate and download financial and operational reports.')}</p>
      </div>

      <div className="bg-card border rounded-xl p-6">
        <form onSubmit={handleDownload} className="space-y-6">
          
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('reports.type', 'Report Type')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reportTypes.map((type) => (
                <label 
                  key={type.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    reportType === type.id ? 'border-primary bg-primary/5' : 'hover:bg-secondary'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={type.id}
                    checked={reportType === type.id}
                    onChange={(e) => setReportType(e.target.value)}
                    className="sr-only"
                  />
                  <span className={reportType === type.id ? 'text-primary font-medium' : ''}>
                    {type.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('reports.startDate', 'Start Date')}</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('reports.endDate', 'End Date')}</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('reports.format', 'Format')}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="text-primary focus:ring-primary"
                />
                <span>PDF</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={format === 'xlsx'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="text-primary focus:ring-primary"
                />
                <span>Excel (XLSX)</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
              {loading ? t('reports.generating', 'Generating...') : t('reports.download', 'Download Report')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
