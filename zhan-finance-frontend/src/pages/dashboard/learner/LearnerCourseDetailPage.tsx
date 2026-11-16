import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Video, FileText, Monitor, ChevronRight, BookOpen, Lock, CheckCircle2 } from 'lucide-react';
import { CourseDto, LessonDto, getCourseById, getCourseProgress, CourseProgressDto } from '@/entities/course/api/courseApi';
import { ROUTES } from '@/shared/config/routes';
import { Spinner } from '@/shared/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthContext';
import { CourseCertificate } from './components/CourseCertificate';
import i18n from '@/shared/i18n/i18n';

// ─── helpers ────────────────────────────────────────────────────────────────

const getLessonTypeConfig = () => ({
  VIDEO: {
    label: i18n.t('learnerCourseDetail.videoLesson', { ns: 'common' }),
    icon: <Video size={16} />,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  PRESENTATION: {
    label: i18n.t('learnerCourseDetail.presentation', { ns: 'common' }),
    icon: <Monitor size={16} />,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  DOCUMENT: {
    label: i18n.t('learnerCourseDetail.document', { ns: 'common' }),
    icon: <FileText size={16} />,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
});

// ─── sub-components ──────────────────────────────────────────────────────────

interface SectionCardProps {
  sectionIndex: number;
  title: string;
  lessons: LessonDto[];
  courseId: string;
  onNavigate: (lessonId: number) => void;
  progress: CourseProgressDto | null;
  globalLessonIndexStart: number;
}

function SectionCard({ sectionIndex, title, lessons, onNavigate, progress, globalLessonIndexStart }: SectionCardProps) {
  const { t } = useTranslation(['common']);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-brand-green text-white text-xs font-bold flex items-center justify-center shrink-0">
            {sectionIndex}
          </span>
          <span className="text-sm font-semibold text-gray-700">{title}</span>
        </div>
        <span className="text-xs text-gray-400">
          {lessons.length} {lessons.length === 1 ? t('learnerCourseDetail.lessonCount1') : t('learnerCourseDetail.lessonCount2')}
        </span>
      </div>

      {/* Lessons */}
      {lessons.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-400">{t('learnerCourseDetail.noLessons')}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {lessons.map((lesson, localIdx) => {
            const config = getLessonTypeConfig();
            const cfg = config[lesson.type];
            const globalIdx = globalLessonIndexStart + localIdx;
            
            // Lesson is completed if its ID is in completedLessonIds
            const isCompleted = progress?.completedLessonIds.includes(lesson.id) || false;
            
            // First lesson is always unlocked. Other lessons are locked if progress hasn't reached them.
            // i.e., globalIdx must be <= completedLessonIds.length
            const isLocked = progress ? globalIdx > progress.completedLessonIds.length : false;

            return (
              <li key={lesson.id}>
                <button
                  onClick={() => !isLocked && onNavigate(lesson.id)}
                  disabled={isLocked}
                  className={`w-full flex items-center gap-3.5 px-5 py-3.5 transition-colors text-left group ${
                    isLocked ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-brand-green/5'
                  }`}
                >
                  {/* Type icon */}
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isLocked ? 'bg-gray-200 text-gray-400' : cfg.iconBg + ' ' + cfg.iconColor}`}
                  >
                    {isLocked ? <Lock size={16} /> : cfg.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>{lesson.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{cfg.label}</p>
                  </div>

                  {/* Status */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isCompleted && <CheckCircle2 size={18} className="text-brand-green" />}
                    {!isLocked && (
                      <ChevronRight
                        size={16}
                        className="text-gray-300 group-hover:text-brand-green transition-colors"
                      />
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export function LearnerCourseDetailPage() {
  const { t } = useTranslation(['common']);
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [progress, setProgress] = useState<CourseProgressDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([
      getCourseById(Number(id)),
      getCourseProgress(Number(id))
    ])
      .then(([courseData, progressData]) => {
        setCourse(courseData);
        setProgress(progressData);
      })
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleLessonClick = (lessonId: number) => {
    navigate(
      ROUTES.LEARNER_LESSON
        .replace(':courseId', id!)
        .replace(':lessonId', String(lessonId))
    );
  };

  // ── loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="md" className="text-brand-green" />
      </div>
    );
  }

  // ── error ────────────────────────────────────────────────────────────────
  if (error || !course) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(ROUTES.LEARNER_COURSES)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={14} />
          {t('learnerCourseDetail.allCourses')}
        </button>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500 text-sm">
          {t('learnerCourseDetail.loadError')}
        </div>
      </div>
    );
  }

  const totalLessons = course.chapters.reduce((acc, chapter) => acc + chapter.lessons.length, 0);

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Back */}
      <button
        onClick={() => navigate(ROUTES.LEARNER_COURSES)}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ArrowLeft size={14} />
        {t('learnerCourseDetail.allCourses')}
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
        {course.description && (
          <p className="text-sm text-gray-500 mt-1">{course.description}</p>
        )}
      </div>

      {/* Stat cards and Progress */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{t('learnerCourseDetail.lessonsCountLabel')}</p>
          <p className="text-3xl font-bold text-gray-900">{totalLessons}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hidden sm:block">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{t('learnerCourseDetail.statusLabel')}</p>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            {t('learnerCourseDetail.available')}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col justify-center">
          <div className="flex justify-between items-end mb-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{t('learnerCourseDetail.progress', { defaultValue: 'Прогресс' })}</p>
            <p className="text-xl font-bold text-brand-green">{progress?.completionPercentage || 0}%</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-brand-green h-2.5 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${progress?.completionPercentage || 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {progress?.isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-green-800">{t('learnerCourseDetail.congrats', { defaultValue: 'Поздравляем!' })}</h3>
            <p className="text-sm text-green-700 mt-1">{t('learnerCourseDetail.completedMsg', { defaultValue: 'Вы успешно завершили этот курс и освоили все материалы.' })}</p>
          </div>
          <CourseCertificate 
            courseId={course.id}
          />
        </div>
      )}

      {/* Chapters / Sections */}
      <div className="space-y-4">
        {course.chapters.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <BookOpen size={16} className="text-brand-green" />
                <span className="text-sm font-semibold text-gray-700">{t('learnerCourseDetail.courseProgram')}</span>
              </div>
              <span className="text-xs text-gray-400">0 {t('learnerCourseDetail.lessonsCountText')}</span>
            </div>
            <div className="px-5 py-12 text-center">
              <BookOpen size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">{t('learnerCourseDetail.noLessonsTitle')}</p>
              <p className="text-xs text-gray-400">{t('learnerCourseDetail.noLessonsSubtext')}</p>
            </div>
          </div>
        ) : (
          (() => {
            let runningCount = 0;
            return course.chapters.sort((a, b) => a.orderIndex - b.orderIndex).map((chapter, index) => {
              const startIdx = runningCount;
              runningCount += chapter.lessons.length;
              
              return (
                <SectionCard
                  key={chapter.id}
                  sectionIndex={index + 1}
                  title={chapter.title}
                  lessons={chapter.lessons}
                  courseId={id!}
                  onNavigate={handleLessonClick}
                  progress={progress}
                  globalLessonIndexStart={startIdx}
                />
              );
            });
          })()
        )}
      </div>

    </div>
  );
}