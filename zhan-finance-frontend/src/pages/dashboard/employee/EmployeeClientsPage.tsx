import { useEffect, useState } from 'react';
import { getClients } from '@/entities/client/api/clientApi';
import type { ClientDto } from '@/entities/client/model/types';
import { MessageCircle } from 'lucide-react';
import { ChatDrawer } from '@/widgets/chat/ChatDrawer';
import { useTranslation } from 'react-i18next';

export function EmployeeClientsPage() {
  const { t } = useTranslation(['common']);
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [chatClientId, setChatClientId] = useState<number | null>(null);
  const [chatClientName, setChatClientName] = useState<string>('');
  const [chatClientAvatar, setChatClientAvatar] = useState<string | null>(null);

  useEffect(() => {
    getClients().then(setClients);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('employeeClients.title')}</h1>
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('employeeClients.name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('employeeClients.email')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('employeeClients.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.user?.fullName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.user?.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setChatClientId(c.user?.id || null);
                        setChatClientName(c.user?.fullName || '');
                        setChatClientAvatar(c.user?.avatarUrl || null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-green/10 text-brand-green rounded-lg hover:bg-brand-green hover:text-white transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {t('employeeClients.chat')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ChatDrawer
        isOpen={chatClientId !== null}
        onClose={() => setChatClientId(null)}
        otherUserId={chatClientId}
        otherUserName={chatClientName}
        otherUserAvatar={chatClientAvatar}
      />
    </div>
  );
}
