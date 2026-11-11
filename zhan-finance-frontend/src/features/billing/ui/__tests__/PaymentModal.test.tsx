/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentModal } from '../PaymentModal';
import { paymentReceiptApi } from '@/entities/billing/api/paymentReceiptApi';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValOrOptions?: any) => {
      if (typeof defaultValOrOptions === 'string') return defaultValOrOptions;
      if (defaultValOrOptions && typeof defaultValOrOptions === 'object' && defaultValOrOptions.defaultValue) {
        return defaultValOrOptions.defaultValue;
      }
      return key;
    },
    i18n: { language: 'ru' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('@/entities/billing/api/paymentReceiptApi', () => ({
  paymentReceiptApi: {
    getRequisites: vi.fn().mockResolvedValue({
      recipientName: 'ТОО ЖАН FINANCE',
      bin: '240140012345',
      iban: 'KZ123456789012345678',
      kbe: '17',
      bankName: 'АО Каспий Банк',
      kaspiPayUrl: 'https://pay.kaspi.kz/pay/test',
    }),
    submitReceipt: vi.fn().mockResolvedValue({ id: 1, status: 'AWAITING_REVIEW' }),
  },
}));

describe('PaymentModal Component', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <PaymentModal
        isOpen={false}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders requisites and form when isOpen is true', async () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        planName="Базовый"
        defaultAmount={45000}
      />
    );

    expect(screen.getByText('Оплата тарифа')).toBeInTheDocument();
    expect(screen.getByText('Базовый')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('ТОО ЖАН FINANCE')).toBeInTheDocument();
      expect(screen.getByText('240140012345')).toBeInTheDocument();
    });
  });

  it('switches payment method tabs between Kaspi and Bank', async () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        defaultAmount={45000}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('ТОО ЖАН FINANCE')).toBeInTheDocument();
    });

    const bankTab = screen.getByText('Банковский перевод');
    fireEvent.click(bankTab);
    expect(bankTab).toBeInTheDocument();

    const kaspiTab = screen.getByText('Kaspi Перевод / QR');
    fireEvent.click(kaspiTab);
    expect(kaspiTab).toBeInTheDocument();
  });

  it('validates PDF-only file input', async () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        defaultAmount={45000}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const txtFile = new File(['hello'], 'receipt.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [txtFile] } });

    await waitFor(() => {
      expect(screen.getByText('Разрешены только файлы формата PDF')).toBeInTheDocument();
    });
  });

  it('successfully submits valid form with PDF file', async () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        subscriptionId={10}
        defaultAmount={45000}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const pdfFile = new File(['dummy-pdf-content'], 'receipt.pdf', { type: 'application/pdf' });

    fireEvent.change(input, { target: { files: [pdfFile] } });

    const submitBtn = screen.getByText('Отправить чек на проверку');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(paymentReceiptApi.submitReceipt).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Чек успешно отправлен')).toBeInTheDocument();
    });
  });

  it('sends the selected invoice ID with a receipt', async () => {
    render(<PaymentModal isOpen={true} onClose={onClose} onSuccess={onSuccess}
      invoiceId={42} invoiceTitle="Бухгалтерское сопровождение" defaultAmount={90000} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'receipt.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(screen.getByText('Отправить чек на проверку'));
    await waitFor(() => expect(paymentReceiptApi.submitReceipt).toHaveBeenCalledTimes(1));
    const data = vi.mocked(paymentReceiptApi.submitReceipt).mock.calls[0][0];
    expect(data.get('invoiceId')).toBe('42');
    expect(data.get('amount')).toBe('90000');
  });

  it('displays only selected plan card when a plan is selected and allows changing plan', async () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        initialPlanId="pro"
      />
    );

    // Shows single selected plan card
    expect(screen.getByText('Выбранный тариф')).toBeInTheDocument();
    expect(screen.getAllByText('Про').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Сменить')).toBeInTheDocument();
    // Tariffs grid is not shown initially
    expect(screen.queryByText('Выберите тариф')).not.toBeInTheDocument();

    // Clicking 'Сменить' shows all tariffs
    fireEvent.click(screen.getByText('Сменить'));
    expect(screen.getByText('Выберите тариф')).toBeInTheDocument();
    expect(screen.getByText('Свернуть')).toBeInTheDocument();

    // Selecting 'Стандарт' updates selected plan and collapses back to single card
    fireEvent.click(screen.getByText('Стандарт'));
    expect(screen.getByText('Выбранный тариф')).toBeInTheDocument();
    expect(screen.getAllByText('Стандарт').length).toBeGreaterThanOrEqual(1);
  });
});
