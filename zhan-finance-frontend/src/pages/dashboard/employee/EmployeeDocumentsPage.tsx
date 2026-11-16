import { useEffect, useState, useRef, useMemo } from 'react';
import { getAllDocuments, uploadDocument, downloadDocument, deleteDocument, downloadZipDocuments } from '@/entities/document/api/documentApi';
import { getClients } from '@/entities/client/api/clientApi';
import type { DocumentDto } from '@/entities/document/model/types';
import type { ClientDto } from '@/entities/client/model/types';
import { Spinner } from '@/shared/ui/Spinner';
import { 
  Upload, Download, Trash2, FileText, FileSpreadsheet, File as FileIcon, 
  Search, Folder, Archive, ShieldCheck, CheckCircle2, List, LayoutGrid, 
  ArrowUpDown, X, FileArchive, Users
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/Toast/ToastContext';

const FOLDERS = [
  { id: 'all', key: 'documents.folders.all', defaultLabel: 'Все документы' },
  { id: 'acts', key: 'documents.folders.acts', defaultLabel: 'Акты ВР' },
  { id: 'reports', key: 'documents.folders.reports', defaultLabel: 'Отчеты' },
  { id: 'contracts', key: 'documents.folders.contracts', defaultLabel: 'Договоры' },
  { id: 'other', key: 'documents.folders.other', defaultLabel: 'Разное' },
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.zip'];
const ACCEPT_ATTRIBUTE = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg,application/zip,application/x-zip-compressed';

export function EmployeeDocumentsPage() {
  const { t } = useTranslation(['common']);
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [uploaderFilter, setUploaderFilter] = useState<'all' | 'staff' | 'client'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name' | 'size'>('date-desc');

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [docsData, clientsData] = await Promise.all([
        getAllDocuments(),
        getClients()
      ]);
      setDocuments(docsData);
      setClients(clientsData);
    } catch (err) {
      setError(t('employeeDocuments.loadError', { defaultValue: 'Не удалось загрузить документы' }));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const processFileUpload = async (file: File) => {
    if (!selectedClientId) {
      toast.error(t('employeeDocuments.selectClientError', { defaultValue: 'Выберите клиента перед загрузкой файла' }));
      return;
    }
    
    setIsUploading(true);
    setError(null);
    try {
      await uploadDocument(file, Number(selectedClientId));
      toast.success(t('employeeDocuments.uploadSuccess', { defaultValue: 'Файл успешно загружен' }));
      
      const docsData = await getAllDocuments();
      setDocuments(docsData);
      setSelectedFolder('all');
      setSearchQuery('');
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      toast.error(err?.message || t('employeeDocuments.uploadError', { defaultValue: 'Ошибка при загрузке документа' }));
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!selectedClientId) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFileUpload(file);
    }
  };

  const handleDownload = async (doc: DocumentDto) => {
    try {
      await downloadDocument(doc.id, doc.fileName);
    } catch (err) {
      console.error('Failed to download', err);
      toast.error(t('employeeDocuments.downloadError', { defaultValue: 'Ошибка скачивания' }));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('employeeDocuments.deleteConfirm', { defaultValue: 'Удалить этот документ?' }))) return;
    try {
      await deleteDocument(id);
      toast.success(t('employeeDocuments.deleteSuccess', { defaultValue: 'Документ удален' }));
      setDocuments(prev => prev.filter(d => d.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error('Failed to delete', err);
      toast.error(t('employeeDocuments.deleteError', { defaultValue: 'Не удалось удалить документ' }));
    }
  };

  const handleDownloadZip = async () => {
    if (selectedIds.size === 0) return;
    setIsDownloadingZip(true);
    try {
      await downloadZipDocuments(Array.from(selectedIds));
      toast.success(t('documents.zipSuccess', { defaultValue: 'Архив успешно скачан' }));
    } catch (err) {
      console.error('Failed zip download', err);
      toast.error(t('documents.zipError', { defaultValue: 'Ошибка при создании архива' }));
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const isUploadedByClient = (doc: DocumentDto) => {
    return doc.uploadedByRole === 'CLIENT' || doc.uploadedByRole === 'LEARNER';
  };

  const getDocCategory = (doc: DocumentDto): 'acts' | 'reports' | 'contracts' | 'other' => {
    const docFolder = (doc.folder || '').toLowerCase();
    const fileName = doc.fileName.toLowerCase();
    if (docFolder.includes('акт') || docFolder.includes('act') || fileName.includes('акт') || fileName.includes('act')) return 'acts';
    if (docFolder.includes('отчет') || docFolder.includes('report') || fileName.includes('отчет') || fileName.includes('report')) return 'reports';
    if (docFolder.includes('договор') || docFolder.includes('contract') || fileName.includes('договор') || fileName.includes('contract')) return 'contracts';
    return 'other';
  };

  // Filter and Sort documents
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        // Client filter dropdown
        if (selectedClientId && doc.userId !== Number(selectedClientId)) return false;

        // Source uploader filter
        const clientUpload = isUploadedByClient(doc);
        if (uploaderFilter === 'staff' && clientUpload) return false;
        if (uploaderFilter === 'client' && !clientUpload) return false;

        // Folder filter
        if (selectedFolder !== 'all') {
          if (getDocCategory(doc) !== selectedFolder) return false;
        }

        // Search query filter
        const matchesSearch = !searchQuery || doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) || (doc.clientName && doc.clientName.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'date-asc') return new Date(a.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'name') return a.fileName.localeCompare(b.fileName);
        if (sortBy === 'size') return b.fileSize - a.fileSize;
        return 0;
      });
  }, [documents, selectedClientId, uploaderFilter, selectedFolder, searchQuery, sortBy]);

  // Counts per folder
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { all: documents.length, acts: 0, reports: 0, contracts: 0, other: 0 };
    documents.forEach(doc => {
      if (selectedClientId && doc.userId !== Number(selectedClientId)) return;
      const cat = getDocCategory(doc);
      counts[cat]++;
    });
    return counts;
  }, [documents, selectedClientId]);

  // Metrics summary
  const metrics = useMemo(() => {
    const relevantDocs = selectedClientId ? documents.filter(d => d.userId === Number(selectedClientId)) : documents;
    const total = relevantDocs.length;
    const awaiting = relevantDocs.filter(d => d.status !== 'CONFIRMED' && !isUploadedByClient(d)).length;
    const signed = relevantDocs.filter(d => d.status === 'CONFIRMED').length;
    return { total, awaiting, signed };
  }, [documents, selectedClientId]);

  const toggleSelectAll = (filteredList: DocumentDto[]) => {
    if (selectedIds.size === filteredList.length && filteredList.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredList.map(d => d.id)));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getDocTypeInfo = (type: string) => {
    const tLower = (type || '').toLowerCase();
    if (tLower.includes('pdf'))
      return { label: 'PDF', icon: FileText, bg: 'bg-red-50 text-red-700 border-red-200' };
    if (tLower.includes('spreadsheet') || tLower.includes('excel') || tLower.includes('xls') || tLower.includes('csv'))
      return { label: 'EXCEL', icon: FileSpreadsheet, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (tLower.includes('word') || tLower.includes('docx') || tLower.includes('doc'))
      return { label: 'WORD', icon: FileText, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (tLower.includes('zip') || tLower.includes('compressed') || tLower.includes('rar') || tLower.includes('7z'))
      return { label: 'ZIP', icon: FileArchive, bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: type.split('/').pop()?.toUpperCase() || 'FILE', icon: FileIcon, bg: 'bg-gray-50 text-gray-700 border-gray-200' };
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {t('employeeDocuments.title', { defaultValue: 'Документы клиентов' })}
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            {t('employeeDocuments.subtitle', { defaultValue: 'Управление документами подопечных клиентов компании' })}
          </p>
        </div>

        {/* Client Filter Selector */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-200/80 shadow-2xs">
          <Users size={16} className="text-gray-400 ml-2" />
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value === '' ? '' : Number(e.target.value))}
            className="bg-transparent text-xs font-bold text-gray-800 border-none focus:ring-0 py-1 pr-8 cursor-pointer"
          >
            <option value="">{t('employeeDocuments.allClients', { defaultValue: 'Все подопечные клиенты' })}</option>
            {clients.map(client => (
              <option key={client.id} value={client.user.id}>
                {client.user.fullName} ({client.user.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-brand-green flex items-center justify-center font-bold">
            <FileText size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('documents.metrics.total', { defaultValue: 'Всего документов' })}</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{metrics.total}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Archive size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('documents.metrics.pending', { defaultValue: 'Ожидают подписи' })}</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{metrics.awaiting}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('documents.metrics.confirmed', { defaultValue: 'Подписано' })}</p>
            <p className="text-2xl font-black text-blue-600 mt-0.5">{metrics.signed}</p>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div 
          className={clsx(
            'border-2 border-dashed rounded-2xl p-6 md:p-8 text-center transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden group',
            !selectedClientId ? 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-200' : 'cursor-pointer',
            isDragging && selectedClientId ? 'border-brand-green bg-emerald-50/60 shadow-md scale-[1.003]' : '',
            selectedClientId && !isDragging ? 'border-gray-200/80 bg-white hover:border-brand-green/50 hover:bg-gray-50/60 hover:shadow-2xs' : ''
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (selectedClientId) fileInputRef.current?.click();
          }}
        >
          <input 
            ref={fileInputRef} 
            type="file" 
            accept={ACCEPT_ATTRIBUTE} 
            className="hidden" 
            onChange={handleFileSelect} 
            disabled={!selectedClientId || isUploading} 
          />
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-brand-green flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xs">
            {isUploading ? <Spinner className="w-6 h-6 text-brand-green" /> : <Upload size={22} />}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              {!selectedClientId 
                ? t('employeeDocuments.selectClientPrompt', { defaultValue: 'Выберите клиента выше для загрузки документа' }) 
                : isUploading 
                ? t('documents.upload.uploading', { defaultValue: 'Загрузка документа...' }) 
                : t('documents.upload.dragOrClick', { defaultValue: 'Перетащите файл или нажмите для загрузки' })}
            </p>
            <p className="text-xs font-medium text-gray-400 mt-1">{t('documents.upload.formats', { defaultValue: 'PDF, DOCX, XLSX, PNG, JPG, ZIP до 20 МБ' })}</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}
      </div>

      {/* Navigation Controls: Folders + Source Filters + Search + Sort + View */}
      <div className="flex flex-col gap-3 bg-white border border-gray-200/80 p-3.5 rounded-2xl shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          {/* Folder Tabs (hide empty ones except 'all') */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {FOLDERS.map((f) => {
              const isSelected = selectedFolder === f.id;
              const count = folderCounts[f.id] || 0;
              if (f.id !== 'all' && count === 0 && !isSelected) return null;

              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFolder(f.id)}
                  className={clsx(
                    'px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap border',
                    isSelected
                      ? 'bg-brand-green text-white border-brand-green shadow-xs'
                      : 'bg-gray-50 text-gray-600 border-gray-200/60 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Folder size={14} className={isSelected ? 'text-white' : 'text-gray-400'} />
                  <span>{t(f.key, { defaultValue: f.defaultLabel })}</span>
                  <span
                    className={clsx(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-extrabold',
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-200/70 text-gray-600'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Source Uploader Filter */}
          <div className="flex items-center bg-gray-100/90 p-1 rounded-xl border border-gray-200/60 shrink-0">
            <button
              type="button"
              onClick={() => setUploaderFilter('all')}
              className={clsx(
                'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                uploaderFilter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              {t('documents.uploaderFilter.all', { defaultValue: 'Все источники' })}
            </button>
            <button
              type="button"
              onClick={() => setUploaderFilter('staff')}
              className={clsx(
                'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                uploaderFilter === 'staff' ? 'bg-white text-brand-green shadow-xs' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              {t('documents.uploaderFilter.company', { defaultValue: 'От компании' })}
            </button>
            <button
              type="button"
              onClick={() => setUploaderFilter('client')}
              className={clsx(
                'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                uploaderFilter === 'client' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {t('documents.uploaderFilter.client', { defaultValue: 'От клиентов' })}
            </button>
          </div>
        </div>

        {/* Bottom bar: Search + Sort + Actions */}
        <div className="flex items-center gap-2.5 flex-wrap justify-between pt-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('employeeDocuments.searchPlaceholder', { defaultValue: 'Поиск по файлам или клиенту...' })}
              className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={isDownloadingZip}
                className="px-3.5 py-2 bg-brand-green hover:bg-brand-green/90 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isDownloadingZip ? <Spinner className="w-3.5 h-3.5 text-white" /> : <Archive size={14} />}
                <span>{t('documents.actions.downloadZip', { defaultValue: `Скачать ZIP (${selectedIds.size})`, count: selectedIds.size })}</span>
              </button>
            )}

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-green/20 cursor-pointer"
              >
                <option value="date-desc">{t('documents.sort.dateDesc', { defaultValue: 'Сначала новые' })}</option>
                <option value="date-asc">{t('documents.sort.dateAsc', { defaultValue: 'Сначала старые' })}</option>
                <option value="name">{t('documents.sort.name', { defaultValue: 'По названию (А-Я)' })}</option>
                <option value="size">{t('documents.sort.size', { defaultValue: 'По размеру' })}</option>
              </select>
              <ArrowUpDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/60">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={clsx(
                  'p-1.5 rounded-lg transition-all cursor-pointer',
                  viewMode === 'table' ? 'bg-white text-brand-green shadow-xs' : 'text-gray-400 hover:text-gray-700'
                )}
                title={t('documents.viewMode.table', { defaultValue: 'Таблица' })}
              >
                <List size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'p-1.5 rounded-lg transition-all cursor-pointer',
                  viewMode === 'grid' ? 'bg-white text-brand-green shadow-xs' : 'text-gray-400 hover:text-gray-700'
                )}
                title={t('documents.viewMode.grid', { defaultValue: 'Сетка' })}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 flex justify-center bg-white border border-gray-200/80 rounded-2xl shadow-2xs">
          <Spinner />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-12 text-center shadow-2xs">
          <div className="w-16 h-16 bg-emerald-50 text-brand-green rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileIcon size={28} />
          </div>
          <h3 className="text-gray-900 font-bold text-base mb-1">{t('documents.empty.title', { defaultValue: 'Документы не найдены' })}</h3>
          <p className="text-gray-500 text-xs max-w-sm mx-auto">
            {t('employeeDocuments.emptyDesc', { defaultValue: 'Попробуйте изменить выбранного клиента, категорию или поисковый запрос.' })}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/80 text-xs font-bold text-gray-500">
                  <th className="px-4 py-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredDocuments.length && filteredDocuments.length > 0}
                      onChange={() => toggleSelectAll(filteredDocuments)}
                      className="rounded border-gray-300 text-brand-green focus:ring-brand-green cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4">{t('documents.table.file', { defaultValue: 'Название файла' })}</th>
                  <th className="px-6 py-4">{t('documents.table.client', { defaultValue: 'Клиент' })}</th>
                  <th className="px-6 py-4">{t('documents.table.type', { defaultValue: 'Тип' })}</th>
                  <th className="px-6 py-4">{t('documents.table.signature', { defaultValue: 'Статус подписи' })}</th>
                  <th className="px-6 py-4">{t('documents.table.size', { defaultValue: 'Размер' })}</th>
                  <th className="px-6 py-4 text-right">{t('documents.table.actions', { defaultValue: 'Действия' })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredDocuments.map((doc) => {
                  const info = getDocTypeInfo(doc.contentType);
                  const Icon = info.icon;
                  const isSelected = selectedIds.has(doc.id);
                  const isConfirmed = doc.status === 'CONFIRMED';
                  const clientUploaded = isUploadedByClient(doc);

                  return (
                    <tr key={doc.id} className={clsx('hover:bg-gray-50/70 transition-colors', isSelected && 'bg-emerald-50/30')}>
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(doc.id)}
                          className="rounded border-gray-300 text-brand-green focus:ring-brand-green cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border', info.bg)}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 truncate max-w-md block" title={doc.fileName}>
                              {doc.fileName}
                            </span>
                            <span className="text-[11px] text-gray-400 font-normal">
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200/60">
                          {doc.clientName || t('employeeDocuments.unknownClient')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-lg border', info.bg)}>
                          {info.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {clientUploaded ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full font-bold text-xs shadow-2xs">
                            <Upload size={13} />
                            {t('documents.status.fromClient', { defaultValue: 'От клиента' })}
                          </span>
                        ) : isConfirmed ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full font-bold text-xs shadow-2xs">
                            <ShieldCheck size={14} />
                            {t('documents.status.signed', { defaultValue: 'Подписано' })} {doc.confirmedAt ? new Date(doc.confirmedAt).toLocaleDateString() : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full font-bold text-xs shadow-2xs">
                            <CheckCircle2 size={13} />
                            {t('documents.status.pendingSignature', { defaultValue: 'Ожидает подписи' })}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs font-semibold">
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleDownload(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 hover:text-brand-green hover:bg-emerald-50 border border-gray-200/80 hover:border-brand-green/30 rounded-xl font-bold text-xs transition-all cursor-pointer"
                            title={t('documents.actions.download', { defaultValue: 'Скачать' })}
                          >
                            <Download size={14} />
                            <span className="hidden sm:inline">{t('documents.actions.download', { defaultValue: 'Скачать' })}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200/50 rounded-xl transition-all cursor-pointer"
                            title={t('documents.actions.delete', { defaultValue: 'Удалить' })}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
