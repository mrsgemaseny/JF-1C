import { useState, useRef, useEffect } from 'react';
import { FileDown, Zap, Loader2, FileText, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { documentTemplateApi } from '../api/documentTemplateApi';
import { DocumentTemplate } from '../model/types';
import { useToast } from '@/shared/ui/Toast/ToastContext';

interface GenerateDocumentButtonProps {
  taskId: number;
  onSuccess: () => void;
}

export function GenerateDocumentButton({ taskId, onSuccess }: GenerateDocumentButtonProps) {
  const { t } = useTranslation(['common']);
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await documentTemplateApi.getAllTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (templateId: string) => {
    try {
      setIsGenerating(true);
      await documentTemplateApi.generateDocument(taskId, templateId);
      setIsOpen(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isGenerating}
        className="text-brand-green hover:text-green-700 p-1 rounded transition-colors disabled:opacity-50 flex items-center gap-1 text-xs font-medium"
      >
        {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
        {t('documents.actions.generate')}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100] sm:hidden bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="fixed sm:absolute bottom-0 left-0 right-0 sm:bottom-auto sm:left-auto sm:right-0 sm:mt-2 w-full sm:w-80 max-h-[80vh] bg-white sm:rounded-lg rounded-t-2xl shadow-2xl border-t sm:border border-gray-100 z-[101] overflow-hidden flex flex-col pb-safe sm:pb-0">
            <div className="px-4 py-4 sm:py-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h4 className="text-sm sm:text-xs font-semibold text-gray-700 sm:text-gray-500 uppercase tracking-wider">{t('documents.actions.selectTemplate')}</h4>
              <button className="sm:hidden p-1 text-gray-500 hover:text-gray-700 bg-gray-200 rounded-full" onClick={() => setIsOpen(false)}>
                <X size={16} />
              </button>
            </div>
            
            <div className="overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 size={24} className="animate-spin mx-auto text-brand-green" />
                </div>
              ) : templates.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">{t('documents.actions.noTemplates')}</div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {templates.map(t => (
                    <li key={t.id}>
                      <button
                        onClick={() => handleGenerate(t.id)}
                        className="w-full text-left px-4 py-4 sm:py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 group"
                      >
                        <FileText size={20} className="text-blue-500 sm:w-4 sm:h-4 mt-0.5 shrink-0" />
                        <div>
                          <span className="block text-base sm:text-sm font-medium text-gray-800 sm:text-gray-700 group-hover:text-brand-green">{t.name}</span>
                          {t.description && <span className="block text-sm sm:text-xs text-gray-500 sm:text-gray-400 mt-1 sm:mt-0.5">{t.description}</span>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
