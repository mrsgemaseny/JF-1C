import React, { useState, useEffect } from 'react';
import { Tag, Plus, X, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { labelsApi } from '../api/labelsApi';
import type { UserLabelDto } from '@/entities/task/model/types';

interface UserLabelManagerProps {
  selectedLabelId: number | null;
  onSelectLabel: (labelId: number | null) => void;
}

const PRESET_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#64748b', // Slate
];

export const UserLabelManager: React.FC<UserLabelManagerProps> = ({
  selectedLabelId,
  onSelectLabel,
}) => {
  const { t } = useTranslation(['crm', 'common']);
  const [labels, setLabels] = useState<UserLabelDto[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  const fetchLabels = async () => {
    try {
      const data = await labelsApi.getMyLabels();
      setLabels(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(t('labels.nameEmpty', { defaultValue: 'Название метки не может быть пустым' }));
      return;
    }
    try {
      await labelsApi.createLabel({ name: name.trim(), color });
      setName('');
      fetchLabels();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('labels.createError', { defaultValue: 'Ошибка создания метки (максимум 5)' }));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await labelsApi.deleteLabel(id);
      if (selectedLabelId === id) onSelectLabel(null);
      fetchLabels();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap my-2">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
        <Tag size={13} /> {t('labels.title', { defaultValue: 'Метки:' })}
      </span>

      <button
        onClick={() => onSelectLabel(null)}
        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
          selectedLabelId === null
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {t('labels.all', { defaultValue: 'Все' })}
      </button>

      {labels.map((lbl) => {
        const isSelected = selectedLabelId === lbl.id;
        return (
          <button
            key={lbl.id}
            onClick={() => onSelectLabel(isSelected ? null : lbl.id)}
            style={{
              backgroundColor: isSelected ? lbl.color : `${lbl.color}15`,
              color: isSelected ? '#ffffff' : lbl.color,
              borderColor: lbl.color,
            }}
            className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            <span>{lbl.name}</span>
          </button>
        );
      })}

      {labels.length < 5 && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer border border-blue-200"
          title={t('labels.addLabelTitle', { defaultValue: 'Добавить свою метку (максимум 5)' })}
        >
          <Plus size={12} /> {t('labels.addLabel', { defaultValue: 'Метка' })}
        </button>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-900">{t('labels.newLabel', { defaultValue: 'Новая метка (до 5)' })}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="mb-3 p-2 text-xs bg-red-50 text-red-600 rounded-md border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('labels.labelName', { defaultValue: 'Название метки' })}
                </label>
                <input
                  type="text"
                  maxLength={30}
                  placeholder={t('labels.placeholder', { defaultValue: 'Например: Срочно, Отчет...' })}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  {t('labels.labelColor', { defaultValue: 'Цвет метки' })}
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        color === c ? 'ring-2 ring-offset-2 ring-gray-800 scale-110' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  {t('labels.cancel', { defaultValue: 'Отмена' })}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium shadow-xs"
                >
                  {t('labels.create', { defaultValue: 'Создать' })}
                </button>
              </div>
            </form>

            {labels.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <span className="text-[11px] font-semibold text-gray-400 block mb-2">{t('labels.savedLabels', { defaultValue: 'Ваши сохраненные метки:' })}</span>
                <div className="space-y-1.5">
                  {labels.map((lbl) => (
                    <div key={lbl.id} className="flex justify-between items-center px-2.5 py-1.5 bg-gray-50 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: lbl.color }} />
                        <span className="font-medium text-gray-700">{lbl.name}</span>
                      </div>
                      <button
                        onClick={() => handleDelete(lbl.id)}
                        className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                        title={t('labels.deleteLabel', { defaultValue: 'Удалить метку' })}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
