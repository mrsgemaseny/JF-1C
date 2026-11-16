import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Paperclip, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { createTask, requestTask } from '@/entities/task/api/taskApi';
import { fetchServices, ServiceDto } from '@/entities/service/api/servicesApi';
import { uploadDocument } from '@/entities/document/api/documentApi';
import { useTranslation } from 'react-i18next';
import { useEscapeKey } from '@/shared/lib/hooks/useEscapeKey';
import { translateServiceName } from '@/shared/i18n/taskTranslator';
import { DatePicker } from '@/shared/ui/DatePicker';
import { toast } from '@/shared/ui/Toast/ToastContext';
import { Input } from '@/shared/ui/Input/Input';
interface TaskCreateModalProps {
  onClose: () => void;
  onCreated: () => void;
  initialServiceId?: number;
}

export function TaskCreateModal({ onClose, onCreated, initialServiceId }: TaskCreateModalProps) {

  const { t, i18n } = useTranslation('crm');
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  // Services
  const [availableServices, setAvailableServices] = useState<ServiceDto[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(initialServiceId ? [initialServiceId] : []);
  
  // Subtasks
  const [subtasks, setSubtasks] = useState<{ title: string; id: number }[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  
  // Files
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEscapeKey(() => onClose(), true);

  useEffect(() => {
    fetchServices().then(setAvailableServices).catch(console.error);
  }, []);

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, { title: newSubtask.trim(), id: Date.now() }]);
    setNewSubtask('');
  };

  const handleRemoveSubtask = (id: number) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.txt', '.md', '.zip', '.rar', '.7z', '.csv'];
    
    const valid: File[] = [];
    for (const file of selected) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        toast.error(t('taskCreate.invalidFileType', {
          defaultValue: `Файл ${file.name} заблокирован: загрузка исполняемых файлов (.exe, .sh, .js) запрещена из соображений безопасности.`
        }), { duration: 6000 });
        continue;
      }
      valid.push(file);
    }
    setFiles(prev => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleService = (id: number) => {
    setSelectedServiceIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t('taskCreate.subjectRequired', { defaultValue: 'Введите суть обращения' }));
      return;
    }
    if (!user) return;
    setIsSubmitting(true);
    setError('');

    try {
      let createdTask;
      
      const subtaskReqs = subtasks.map(st => ({ title: st.title }));
      
      if (user.role === 'CLIENT') {
        createdTask = await requestTask({
          title,
          description: description || undefined,
          clientId: user.userId,
          dueDate: dueDate || undefined,
          subtasks: subtaskReqs.length > 0 ? subtaskReqs : undefined,
          serviceIds: selectedServiceIds.length > 0 ? selectedServiceIds : undefined
        });
      } else {
        createdTask = await createTask({
          title,
          description: description || undefined,
          clientId: user.userId, // simplified for admin creating for themselves, would need client selector normally
          dueDate: dueDate || undefined,
          subtasks: subtaskReqs.length > 0 ? subtaskReqs : undefined,
          serviceIds: selectedServiceIds.length > 0 ? selectedServiceIds : undefined
        });
      }

      // Upload files without blocking modal completion
      if (files.length > 0 && createdTask.id) {
        const failedFiles: string[] = [];
        for (const file of files) {
          try {
            await uploadDocument(file, undefined, createdTask.id);
          } catch (fileErr) {
            console.error('Failed to upload file attachment:', file.name, fileErr);
            failedFiles.push(file.name);
          }
        }
        if (failedFiles.length > 0) {
          toast.warning(t('taskCreate.partialUploadError', {
            defaultValue: `Задача создана, но не удалось прикрепить файлы: ${failedFiles.join(', ')}`
          }));
        }
      }

      onCreated();
    } catch (err: any) {
      setError(err.message || t('taskCreate.error', { defaultValue: 'Ошибка при создании задачи' }));
      setIsSubmitting(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-[95vw] max-w-[1400px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{t('taskCreate.title', { defaultValue: 'Новая заявка' })}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">
              {error}
            </div>
          )}

          <form id="create-task-form" onSubmit={handleSubmit} noValidate className="space-y-6">
            
            {/* Main Info */}
            <div className="space-y-4">
              <Input
                label={`${t('taskCreate.subject', { defaultValue: 'Суть обращения' })} *`}
                type="text"
                value={title}
                onChange={e => {
                  setTitle(e.target.value);
                  if (error) setError('');
                }}
                autoFocus
                placeholder={t('taskCreate.subjectPlaceholder', { defaultValue: 'Например: Справка о доходах, Бухгалтерское сопровождение...' })}
                error={error && !title.trim() ? error : undefined}
              />

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('taskCreate.details', { defaultValue: 'Детали (необязательно)' })}</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                  placeholder={t('taskCreate.detailsPlaceholder', { defaultValue: 'Опишите задачу подробнее...' })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('taskCreate.deadline', { defaultValue: 'Желаемый срок (Дедлайн)' })}</label>
                <DatePicker
                  value={dueDate}
                  onChange={setDueDate}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Services Selection */}
            {availableServices.length > 0 && (
              <div className="border-t border-gray-100 pt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">{t('taskCreate.linkedServices', { defaultValue: 'Связанные услуги' })}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableServices.map(service => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    return (
                      <div 
                        key={service.id}
                        onClick={() => toggleService(service.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected ? 'bg-brand-green/5 border-brand-green' : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-brand-green border-brand-green' : 'border-gray-300'
                        }`}>
                          {isSelected && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${isSelected ? 'text-brand-green' : 'text-gray-700'}`}>
                            {translateServiceName(service, t, i18n)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subtasks */}
            <div className="border-t border-gray-100 pt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('taskCreate.subtasks', { defaultValue: 'Подзадачи (чек-лист)' })}</label>
              
              <div className="space-y-2 mb-3">
                {subtasks.map((st, index) => (
                  <div key={st.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span className="text-gray-400 font-medium text-sm w-5">{index + 1}.</span>
                    <span className="flex-1 text-sm text-gray-700">{st.title}</span>
                    <button type="button" onClick={() => handleRemoveSubtask(st.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-white transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                  placeholder={t('taskCreate.addSubtaskPlaceholder', { defaultValue: 'Добавить пункт чек-листа...' })}
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  disabled={!newSubtask.trim()}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Attachments */}
            <div className="border-t border-gray-100 pt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('taskCreate.attachments', { defaultValue: 'Вложения' })}</label>
              
              {files.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-100 rounded-lg text-sm">
                      <Paperclip size={14} className="text-gray-400" />
                      <span className="truncate flex-1 text-gray-700">{f.name}</span>
                      <button 
                        type="button" 
                        onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:text-brand-green hover:border-brand-green hover:bg-brand-green/5 transition-all flex flex-col items-center justify-center gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                  <Paperclip size={18} />
                </div>
                <span className="text-sm font-medium">{t('taskCreate.attachFiles', { defaultValue: 'Прикрепить файлы' })}</span>
              </button>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 bg-white border border-gray-200 rounded-xl transition-colors"
          >
            {t('taskCreate.cancel', { defaultValue: 'Отмена' })}
          </button>
          <button
            type="submit"
            form="create-task-form"
            disabled={isSubmitting || !title.trim()}
            className="px-6 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white text-sm font-bold rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? t('taskCreate.submitting', { defaultValue: 'Создание...' }) : t('taskCreate.submit', { defaultValue: 'Создать заявку' })}
          </button>
        </div>
      </div>
    </div>
  );
}
