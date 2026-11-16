import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CourseDto, getAdminCourses, deleteCourse } from '@/entities/course/api/courseApi';
import { ROUTES } from '@/shared/config/routes';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const navigate = useNavigate();
  const { t } = useTranslation(['common']);

  const fetchCourses = () => {
    getAdminCourses().then(setCourses).catch(console.error);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleDelete = async (courseId: number) => {
    if (window.confirm(t('common:actions.confirmDelete', { defaultValue: 'Вы уверены, что хотите удалить?' }))) {
      try {
        await deleteCourse(courseId);
        fetchCourses();
      } catch (e) {
        console.error(e);
        alert('Ошибка при удалении');
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('adminCourses.title')}</h1>
        <button 
          onClick={() => navigate(ROUTES.ADMIN_COURSES_NEW)}
          className="bg-brand-green text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-green/90 flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('adminCourses.createCourse')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">ID</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">{t('adminCourses.name')}</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">{t('adminCourses.status')}</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">{t('adminCourses.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {courses.map(course => (
              <tr key={course.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500">{course.id}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{course.title}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${course.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {course.status === 'PUBLISHED' ? t('adminCourses.published') : t('adminCourses.draft')}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => navigate(ROUTES.ADMIN_COURSES_EDIT.replace(':id', String(course.id)))}
                    className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                    title={t('adminCourses.edit')}
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(course.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title={t('common:actions.delete', { defaultValue: 'Удалить' })}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">{t('adminCourses.empty')}</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
