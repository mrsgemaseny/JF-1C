import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Spinner } from '@/shared/ui/Spinner';
import { downloadCertificatePdf } from '@/entities/course/api/courseApi';

interface CourseCertificateProps {
  courseId: number;
  courseTitle?: string;
  studentName?: string;
  date?: string;
}

import { useTranslation } from 'react-i18next';

export function CourseCertificate({ courseId }: CourseCertificateProps) {
  const { t } = useTranslation(['common']);
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPdf = async () => {
    setIsGenerating(true);
    try {
      await downloadCertificatePdf(courseId);
    } catch (err) {
      console.error('Error generating PDF', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <button 
        onClick={downloadPdf} 
        disabled={isGenerating}
        className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shrink-0 flex items-center gap-2 disabled:opacity-50"
      >
        {isGenerating ? <Spinner size="sm" className="text-white" /> : <Download size={18} />}
        {t('courseCertificate.download', { defaultValue: 'Скачать сертификат' })}
      </button>
    </>
  );
}
