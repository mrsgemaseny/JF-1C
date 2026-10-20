import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Translation } from 'react-i18next';
import * as Sentry from '@sentry/react';
import { isChunkLoadError, markChunkLoadSuccess } from '@/shared/lib/react/chunkRecovery';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  private handleReset = () => {
    markChunkLoadSuccess();
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError = isChunkLoadError(this.state.error);

      return (
        <Translation ns="common">
          {(t) => (
            <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
              <div className="bg-red-50 text-red-600 p-6 sm:p-8 rounded-3xl shadow-sm border border-red-100 max-w-lg w-full">
                <h2 className="text-xl sm:text-2xl font-black mb-3">
                  {t('ui.errorBoundary.title', { defaultValue: 'Что-то пошло не так' })}
                </h2>
                
                <p className="text-sm font-medium opacity-90 mb-6 bg-white/80 p-4 rounded-2xl border border-red-100/60 leading-relaxed text-left text-gray-700">
                  {isChunkError
                    ? t('ui.errorBoundary.chunkError', { defaultValue: 'Версия приложения была обновлена. Пожалуйста, обновите страницу для продолжения работы.' })
                    : (this.state.error?.message || t('ui.errorBoundary.unknown', { defaultValue: 'Неизвестная ошибка' }))
                  }
                </p>

                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-6 py-3.5 bg-brand-green text-white rounded-xl hover:bg-brand-green/90 transition-all w-full font-bold shadow-md shadow-brand-green/20 text-base"
                >
                  {t('ui.errorBoundary.reload', { defaultValue: 'Обновить страницу' })}
                </button>
              </div>
            </div>
          )}
        </Translation>
      );
    }

    return this.props.children;
  }
}
