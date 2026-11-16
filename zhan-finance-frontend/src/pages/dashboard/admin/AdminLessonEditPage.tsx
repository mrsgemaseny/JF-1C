import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, File, Film } from 'lucide-react';
import { CourseDto, LessonDto, getAdminCourseById, updateLesson } from '@/entities/course/api/courseApi';
import { ROUTES } from '@/shared/config/routes';
import { useTranslation } from 'react-i18next';

export function AdminLessonEditPage() {
  const { t } = useTranslation(['common']);
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseDto | null>(null);
  const [lesson, setLesson] = useState<LessonDto | null>(null);
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [isPreview, setIsPreview] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoType, setVideoType] = useState<'link' | 'file'>('link');
  
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (courseId && lessonId) {
      getAdminCourseById(Number(courseId))
        .then((data) => {
          setCourse(data);
          const found = data.chapters.flatMap(c => c.lessons).find(l => l.id === Number(lessonId));
          if (found) {
            setLesson(found);
            setTitle(found.title);
            setContent(found.content || '');
            setDurationMinutes(found.durationMinutes || 0);
            setIsPreview(found.isPreview || false);
            setMediaUrl(found.mediaUrl || '');
            if (found.mediaUrl && found.mediaUrl.includes('/uploads/')) {
                setVideoType('file');
            } else {
                setVideoType('link');
            }
          }
          setIsLoading(false);
        })
        .catch(console.error);
    }
  }, [courseId, lessonId]);

  const handleSave = async () => {
    if (!lesson) return;
    setIsSaving(true);
    try {
      // First update the lesson title and basic properties
      await updateLesson(lesson.id, title, undefined, content, undefined, videoType === 'file' ? (file || undefined) : undefined, undefined, durationMinutes, isPreview, videoType === 'link' ? mediaUrl : '');

      alert(t('adminLessonEdit.saveSuccess'));
      // Refresh lesson data to show new file
      const updatedCourse = await getAdminCourseById(Number(courseId));
      const updatedLesson = updatedCourse.chapters.flatMap(c => c.lessons).find(l => l.id === Number(lessonId));
      if (updatedLesson) setLesson(updatedLesson);
      setFile(null); // Clear selected file after successful save
    } catch (e) {
      console.error(e);
      alert(t('adminLessonEdit.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  if (isLoading) return <div className="p-6">{t('common.loading')}</div>;

  let currentFileName = null;
  if (lesson?.mediaUrl) {
     currentFileName = lesson.mediaUrl.split('/').pop() || 'File';
  }

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50 overflow-hidden">
      <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between shrink-0 shadow-sm">
        <button 
          onClick={() => navigate(ROUTES.ADMIN_COURSES_EDIT.replace(':id', courseId!))}
          className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('adminLessonEdit.backToCourse')}
        </button>

        <div className="flex-1 max-w-2xl mx-8">
            <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="text-2xl font-bold bg-transparent outline-none w-full border-b border-transparent focus:border-gray-300 transition-colors text-center"
                placeholder={t('adminLessonEdit.lessonNamePlaceholder')}
            />
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-brand-green text-white px-5 py-2 rounded-lg font-medium hover:bg-brand-green/90 flex items-center gap-2 transition-colors shrink-0 disabled:opacity-50 shadow-md"
        >
          <Save className="w-5 h-5" />
          {isSaving ? t('adminLessonEdit.saving') : t('adminLessonEdit.save')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
        <div className="w-full max-w-[1400px] space-y-8 pb-20">
            
            {/* Текстовая секция */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                <label className="text-gray-500 text-sm font-medium mb-3 uppercase tracking-wider">{t('adminLessonEdit.mainTextLabel')}</label>
                <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder={t('adminLessonEdit.mainTextPlaceholder')}
                    className="w-full min-h-[400px] text-lg text-gray-800 outline-none resize-y placeholder-gray-300"
                />
            </div>

            {/* Настройки урока */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
                <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">{t('adminLessonEdit.settingsLabel', { defaultValue: 'Настройки урока' })}</h3>
                
                <div className="flex flex-col sm:flex-row gap-6">
                    <div className="w-full sm:w-1/3">
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('adminLessonEdit.durationLabel', { defaultValue: 'Длительность (минут)' })}</label>
                        <input
                            type="number"
                            min={0}
                            value={durationMinutes}
                            onChange={e => setDurationMinutes(Number(e.target.value))}
                            className="w-full px-4 py-2.5 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:border-brand-green outline-none transition-all font-medium"
                        />
                    </div>
                </div>

                </div>

            {/* Секция загрузки медиа */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider m-0 block">{t('adminLessonEdit.fileLabel')}</h3>
                    
                    <div className="flex bg-gray-100 p-1 rounded-xl w-max">
                        <button 
                            onClick={() => setVideoType('link')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${videoType === 'link' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('adminLessonEdit.byLink')}
                        </button>
                        <button 
                            onClick={() => setVideoType('file')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${videoType === 'file' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('adminLessonEdit.uploadFile')}
                        </button>
                    </div>
                </div>
                
                {videoType === 'link' ? (
                    <div className="animate-in fade-in duration-200">
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('adminLessonEdit.mediaUrlLabel', { defaultValue: 'Ссылка на видео (YouTube / Vimeo / mp4)' })}</label>
                        <input
                            type="text"
                            value={mediaUrl}
                            onChange={e => setMediaUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-4 py-3 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:border-brand-green outline-none transition-all font-medium"
                        />
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-200">
                        {currentFileName && !file && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-4">
                                {lesson?.type === 'VIDEO' ? <Film className="w-8 h-8 text-blue-500" /> : <File className="w-8 h-8 text-gray-500" />}
                                <div>
                                    <p className="font-medium text-gray-900">{t('adminLessonEdit.currentFile')} {currentFileName}</p>
                                </div>
                            </div>
                        )}

                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden" 
                                onChange={handleFileChange}
                            />
                            <Upload className="w-10 h-10 text-gray-400 mb-3" />
                            <p className="text-gray-900 font-medium text-lg">
                                {file ? file.name : t('adminLessonEdit.uploadText')}
                            </p>
                            <p className="text-gray-500 text-sm mt-1">
                                {file ? `${t('adminLessonEdit.size')} ${(file.size / 1024 / 1024).toFixed(2)} MB` : t('adminLessonEdit.uploadSubtext')}
                            </p>
                        </div>
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
}
