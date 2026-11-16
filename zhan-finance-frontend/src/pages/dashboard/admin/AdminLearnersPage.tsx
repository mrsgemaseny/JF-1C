import { useEffect, useState } from 'react';
import { UserProfileDto, getAllLearners, createLearner } from '@/entities/user/api/userApi';
import { Plus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/Input/Input';

export function AdminLearnersPage() {
  const { t } = useTranslation(['common']);
  const [learners, setLearners] = useState<UserProfileDto[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});

  const loadLearners = () => {
    getAllLearners().then(setLearners).catch(console.error);
  };

  useEffect(() => {
    loadLearners();
  }, []);

  const validate = () => {
    const errs: typeof formErrors = {};
    if (!fullName.trim()) errs.fullName = t('adminLearners.errors.fullName', { defaultValue: 'Введите ФИО' });
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = t('adminLearners.errors.email', { defaultValue: 'Некорректный email' });
    }
    if (password.length < 8) {
      errs.password = t('adminLearners.errors.password', { defaultValue: 'Минимум 8 символов' });
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createLearner({ fullName: fullName.trim(), email: email.trim(), password });
      setShowModal(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setFormErrors({});
      loadLearners();
    } catch (err: any) {
      alert(err.message || t('adminLearners.createError'));
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="text-brand-green" />
          {t('adminLearners.title')}
        </h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-brand-green text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-green/90 flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('adminLearners.addLearner')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">ID</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">{t('adminLearners.fullName')}</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">{t('adminLearners.email')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {learners.map(learner => (
              <tr key={learner.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500">{learner.id}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{learner.fullName}</td>
                <td className="px-6 py-4 text-gray-600">{learner.email}</td>
              </tr>
            ))}
            {learners.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">{t('adminLearners.empty')}</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">{t('adminLearners.newLearnerModalTitle')}</h2>
            <form onSubmit={handleCreate} noValidate className="space-y-4">
              <Input
                label={t('adminLearners.fullName')}
                type="text"
                value={fullName}
                onChange={e => {
                  setFullName(e.target.value);
                  if (formErrors.fullName) setFormErrors(prev => ({ ...prev, fullName: undefined }));
                }}
                error={formErrors.fullName}
              />
              <Input
                label={t('adminLearners.email')}
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (formErrors.email) setFormErrors(prev => ({ ...prev, email: undefined }));
                }}
                error={formErrors.email}
              />
              <Input
                label={t('adminLearners.password')}
                type="password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (formErrors.password) setFormErrors(prev => ({ ...prev, password: undefined }));
                }}
                hint={t('adminLearners.passwordHint')}
                error={formErrors.password}
              />
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">{t('adminLearners.cancel')}</button>
                <button type="submit" className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green/90">{t('adminLearners.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
