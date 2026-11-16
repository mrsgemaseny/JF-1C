import { useState } from 'react';
import { CourseDto, LessonDto, createChapter, createLessonForChapter, deleteChapter, deleteLesson } from '@/entities/course/api/courseApi';
import { ChevronDown, ChevronRight, Plus, Video, FileText, Layers, Edit3, Check, X, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CourseCurriculumTabProps {
  course: CourseDto;
  onEditLesson: (lesson: LessonDto) => void;
  onReload: () => void;
}

export function CourseCurriculumTab({ course, onEditLesson, onReload }: CourseCurriculumTabProps) {
  const { t } = useTranslation(['common']);
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({});
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [addingLessonToChapter, setAddingLessonToChapter] = useState<number | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');

  const toggleChapter = (chapterId: number) => {
    setExpandedChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  const handleAddChapter = async () => {
    if (!newChapterTitle.trim()) return;
    try {
      await createChapter(course.id, newChapterTitle);
      setNewChapterTitle('');
      setIsAddingChapter(false);
      onReload();
    } catch (e) {
      console.error(e);
      alert(t('adminCourseEdit.createChapterError', { defaultValue: 'Ошибка при создании модуля' }));
    }
  };

  const handleAddLesson = async (chapterId: number) => {
    if (!newLessonTitle.trim()) return;
    try {
      await createLessonForChapter(chapterId, newLessonTitle, '', 'VIDEO');
      setNewLessonTitle('');
      setAddingLessonToChapter(null);
      onReload();
    } catch (e) {
      console.error(e);
      alert(t('adminCourseEdit.lessonCreateError', { defaultValue: 'Ошибка создания урока.' }));
    }
  };

  const handleDeleteChapter = async (chapterId: number) => {
    if (window.confirm(t('adminCourseEdit.deleteChapterConfirm', { defaultValue: 'Удалить этот модуль и все его уроки? Это действие нельзя отменить.' }))) {
      try {
        await deleteChapter(chapterId);
        onReload();
      } catch (e) {
        console.error(e);
        alert(t('adminCourseEdit.deleteChapterError', { defaultValue: 'Ошибка при удалении модуля' }));
      }
    }
  };

  const handleDeleteLesson = async (lessonId: number) => {
    if (window.confirm(t('adminCourseEdit.lessonDeleteConfirm', { defaultValue: 'Удалить этот урок?' }))) {
      try {
        await deleteLesson(lessonId);
        onReload();
      } catch (e) {
        console.error(e);
        alert(t('adminCourseEdit.lessonDeleteError', { defaultValue: 'Ошибка при удалении урока' }));
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Curriculum Header Bar */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand-green" />
          <h2 className="text-lg font-bold text-gray-900">{t('adminCourseEdit.curriculumTitle', { defaultValue: 'Программа курса' })}</h2>
        </div>

        {!isAddingChapter && (
          <button 
            onClick={() => setIsAddingChapter(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-green/10 text-brand-green font-semibold text-xs rounded-xl hover:bg-brand-green hover:text-white transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" /> {t('adminCourseEdit.addChapterBtn', { defaultValue: 'Добавить модуль' })}
          </button>
        )}
      </div>

      {/* Inline Add Chapter Form */}
      {isAddingChapter && (
        <div className="bg-emerald-50/50 border border-emerald-200/70 p-4 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider">
            {t('adminCourseEdit.chapterTitleLabel', { defaultValue: 'Название нового модуля / главы' })}
          </label>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              autoFocus
              value={newChapterTitle}
              onChange={e => setNewChapterTitle(e.target.value)}
              placeholder={t('adminCourseEdit.chapterTitlePlaceholder', { defaultValue: 'Например: Модуль 1. Основы работы в 1С...' })}
              className="flex-1 px-3.5 py-2 text-sm bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none font-medium"
              onKeyDown={e => e.key === 'Enter' && handleAddChapter()}
            />
            <button 
              onClick={handleAddChapter}
              className="inline-flex items-center gap-1 px-4 py-2 bg-brand-green text-white text-xs font-bold rounded-xl hover:bg-brand-green/90 transition-all shadow-sm"
            >
              <Check className="w-4 h-4" /> {t('common:save', { defaultValue: 'Сохранить' })}
            </button>
            <button 
              onClick={() => setIsAddingChapter(false)}
              className="inline-flex items-center gap-1 px-3 py-2 text-gray-500 hover:text-gray-700 text-xs font-medium rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" /> {t('common:cancel', { defaultValue: 'Отмена' })}
            </button>
          </div>
        </div>
      )}

      {/* Chapters & Lessons List */}
      <div className="space-y-4">
        {course.chapters && course.chapters.length > 0 ? (
          course.chapters.map((chapter, idx) => {
            const isExpanded = expandedChapters[chapter.id] !== false;
            
            return (
              <div 
                key={chapter.id} 
                className="bg-gray-50/60 border border-gray-200/80 rounded-2xl overflow-hidden transition-all duration-200"
              >
                {/* Chapter Card Header */}
                <div className="px-4 py-3 bg-white flex items-center justify-between border-b border-gray-100">
                  <div 
                    className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 py-1"
                    onClick={() => toggleChapter(chapter.id)}
                  >
                    <button className="text-gray-400 hover:text-gray-600 transition-colors p-0.5">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">
                      {t('adminCourseEdit.modulePrefix', { defaultValue: 'Модуль' })} {idx + 1}
                    </span>
                    <h3 className="font-bold text-gray-900 text-sm truncate">{chapter.title}</h3>
                    <span className="text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-100 rounded-full shrink-0">
                      {chapter.lessons?.length || 0} {t('adminCourseEdit.lessonsCount', { defaultValue: 'уроков' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChapter(chapter.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors"
                      title={t('adminCourseEdit.deleteChapterTitle', { defaultValue: 'Удалить модуль' })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddingLessonToChapter(chapter.id);
                        if (!isExpanded) toggleChapter(chapter.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-green hover:bg-brand-green/10 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t('adminCourseEdit.lessonBtn', { defaultValue: 'Урок' })}
                    </button>
                  </div>
                </div>

                {/* Lessons Body */}
                {isExpanded && (
                  <div className="p-3 space-y-2">
                    {chapter.lessons && chapter.lessons.length > 0 ? (
                      chapter.lessons.map((lesson, lIdx) => {
                        const isVideo = Boolean(lesson.mediaUrl);

                        return (
                          <div 
                            key={lesson.id} 
                            onClick={() => onEditLesson(lesson)}
                            className="group flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-xl hover:border-brand-green/40 hover:shadow-xs cursor-pointer transition-all duration-150"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isVideo ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                {isVideo ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                              </div>
                              
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-gray-400">
                                    {idx + 1}.{lIdx + 1}
                                  </span>
                                  <span className="text-sm font-semibold text-gray-800 group-hover:text-brand-green transition-colors truncate">
                                    {lesson.title}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {lesson.durationMinutes && (
                                <span className="text-xs text-gray-400 font-medium">
                                  {lesson.durationMinutes} {t('adminCourseEdit.minutesShort', { defaultValue: 'мин' })}
                                </span>
                              )}
                              <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-bold text-brand-green bg-brand-green/10 px-2.5 py-1 rounded-lg transition-all">
                                <Edit3 className="w-3.5 h-3.5" /> {t('adminCourseEdit.editLesson', { defaultValue: 'Редактировать' })}
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteLesson(lesson.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title={t('adminCourseEdit.deleteLessonTitle', { defaultValue: 'Удалить урок' })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 bg-white border border-dashed border-gray-200 rounded-xl">
                        <p className="text-xs text-gray-400 font-medium">{t('adminCourseEdit.noLessonsInChapter', { defaultValue: 'В этом модуле пока нет уроков' })}</p>
                      </div>
                    )}

                    {/* Inline Add Lesson Form */}
                    {addingLessonToChapter === chapter.id && (
                      <div className="flex items-center gap-2 p-2 bg-emerald-50/60 border border-emerald-200/80 rounded-xl animate-in fade-in duration-150 mt-2">
                        <input 
                          type="text" 
                          autoFocus
                          value={newLessonTitle}
                          onChange={e => setNewLessonTitle(e.target.value)}
                          placeholder={t('adminCourseEdit.lessonPlaceholder', { defaultValue: 'Например: Урок 1. Установка и настройка...' })}
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium"
                          onKeyDown={e => e.key === 'Enter' && handleAddLesson(chapter.id)}
                        />
                        <button 
                          onClick={() => handleAddLesson(chapter.id)}
                          className="px-3 py-1.5 bg-brand-green text-white text-xs font-bold rounded-lg hover:bg-brand-green/90 transition-all shadow-xs"
                        >
                          {t('common:save', { defaultValue: 'Сохранить' })}
                        </button>
                        <button 
                          onClick={() => setAddingLessonToChapter(null)}
                          className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium rounded-lg"
                        >
                          {t('common:cancel', { defaultValue: 'Отмена' })}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
            <p className="text-sm font-semibold text-gray-500 mb-1">{t('adminCourseEdit.noChapters', { defaultValue: 'Нет созданных модулей' })}</p>
            <p className="text-xs text-gray-400 mb-4">{t('adminCourseEdit.noChaptersDesc', { defaultValue: 'Создайте первый модуль, чтобы начать наполнять курс уроками.' })}</p>
            <button 
              onClick={() => setIsAddingChapter(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-green text-white text-xs font-bold rounded-xl hover:bg-brand-green/90 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> {t('adminCourseEdit.addChapterBtn', { defaultValue: 'Добавить модуль' })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
