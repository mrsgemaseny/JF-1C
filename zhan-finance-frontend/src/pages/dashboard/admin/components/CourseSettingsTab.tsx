import { Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CourseSettingsTabProps {
  title: string;
  setTitle: (t: string) => void;
  description: string;
  setDescription: (d: string) => void;
  isPublished: boolean;
  onPublishToggle: () => void;
  onSave: () => void;
}

export function CourseSettingsTab({
  title, setTitle, description, setDescription, isPublished, onPublishToggle, onSave
}: CourseSettingsTabProps) {
  const { t } = useTranslation(['common']);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('adminCourseEdit.courseNameLabel')}</label>
        <input 
          type="text" 
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
          placeholder={t('adminCourseEdit.courseNamePlaceholder')}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('adminCourseEdit.descriptionLabel')}</label>
        <textarea 
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={5}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
          placeholder={t('adminCourseEdit.descriptionPlaceholder')}
        />
      </div>
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-100">
        <div>
          <h4 className="font-medium text-gray-900">{t('adminCourseEdit.publishCourse', { defaultValue: 'Опубликовать курс' })}</h4>
          <p className="text-sm text-gray-500">
            {isPublished 
              ? t('adminCourseEdit.publishedDesc', { defaultValue: 'Курс сейчас опубликован и виден всем.' }) 
              : t('adminCourseEdit.hiddenDesc', { defaultValue: 'Курс скрыт. Опубликуйте его, чтобы сделать доступным.' })}
          </p>
        </div>
        <button
          onClick={onPublishToggle}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 ${isPublished ? 'bg-brand-green' : 'bg-gray-200'}`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPublished ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button 
          onClick={onSave}
          className="bg-brand-green text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-green/90 flex items-center gap-2 transition-colors"
        >
          <Save className="w-5 h-5" />
          {t('adminCourseEdit.save')}
        </button>
      </div>
    </div>
  );
}
