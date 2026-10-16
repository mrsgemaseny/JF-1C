import { Shield, Lock, FileText, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { BrandLogo } from '@/shared/ui/BrandLogo';

export function PrivacyPolicyPage() {
  return (
    <main className="bg-brand-beige min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-6">
        {/* Top bar with Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to={ROUTES.HOME}
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-green hover:opacity-80 transition-opacity bg-white px-4 py-2 rounded-full border border-brand-green/10 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            На главную
          </Link>
          <BrandLogo className="h-7 w-auto" />
        </div>

        {/* Header Banner */}
        <div className="bg-brand-green text-brand-beige rounded-3xl p-8 md:p-12 mb-10 shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-beige/70 mb-4">
              <Shield className="w-4 h-4" />
              <span>Юридическая документация</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4">
              Политика конфиденциальности
            </h1>
            <p className="text-brand-beige/80 text-base md:text-lg max-w-2xl">
              Регламент сбора, обработки и защиты персональных данных пользователей и клиентов цифровой платформы ЖАН FINANCE в соответствии с законодательством Республики Казахстан.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-wider text-brand-beige/60">
              <span>Дата вступления в силу: 1 сентября 2026 г.</span>
              <span>•</span>
              <span>Редакция: 2.1</span>
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-brand-green/10 text-brand-green/90 space-y-10 leading-relaxed font-normal">
          
          {/* 1. Общие положения */}
          <section className="space-y-4">
            <h2 className="text-2xl font-black text-brand-green uppercase tracking-tight flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-brand-green/10 text-brand-green text-sm flex items-center justify-center font-bold">1</span>
              Общие положения
            </h2>
            <p>
              1.1. Настоящая Политика конфиденциальности (далее — «Политика») регулирует отношения по обработке и защите персональных данных между ТОО «ЖАН FINANCE» (БИН 240140023819, далее — «Оператор») и пользователями SaaS-платформы ЖАН FINANCE (далее — «Пользователь» или «Субъект данных»).
            </p>
            <p>
              1.2. Политика разработана в строгом соответствии с Законом Республики Казахстан от 21 мая 2013 года № 94-V «О персональных данных и их защите», а также иными нормативными правовыми актами РК в сфере информационной безопасности и защиты персональных данных.
            </p>
            <p>
              1.3. Использование сервисов, регистрация учетной записи или отправка заявки через форму обратной связи означает безоговорочное согласие Пользователя с условиями настоящей Политики и указанными в ней условиями обработки персональных данных.
            </p>
          </section>

          {/* 2. Локализация баз данных */}
          <section className="space-y-4">
            <h2 className="text-2xl font-black text-brand-green uppercase tracking-tight flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-brand-green/10 text-brand-green text-sm flex items-center justify-center font-bold">2</span>
              Локализация и хранение баз данных (ст. 12 Закона РК № 94-V)
            </h2>
            <div className="p-5 rounded-2xl bg-brand-green/5 border border-brand-green/15 text-sm space-y-2">
              <div className="flex items-center gap-2 font-bold text-brand-green">
                <Lock className="w-4 h-4 text-brand-green shrink-0" />
                Требование национального суверенитета данных
              </div>
              <p>
                В соответствии с пунктом 2 статьи 12 Закона РК «О персональных данных и их защите», сбор и обработка персональных данных осуществляются Оператором с обязательным нахождением и хранением баз данных, содержащих персональные данные граждан Республики Казахстан, на серверах и в центрах обработки данных, физически расположенных на территории Республики Казахстан.
              </p>
            </div>
            <p>
              2.1. Резервное копирование и архивные копии информационных систем также производятся с соблюдением требований локализации и шифрования данных в защищенных дата-центрах РК уровня не ниже Tier III.
            </p>
          </section>

          {/* 3. Состав собираемых данных */}
          <section className="space-y-4">
            <h2 className="text-2xl font-black text-brand-green uppercase tracking-tight flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-brand-green/10 text-brand-green text-sm flex items-center justify-center font-bold">3</span>
              Категории обрабатываемых персональных данных
            </h2>
            <p>Оператор собирает и обрабатывает исключительно данные, минимально необходимые для оказания услуг:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-brand-green">Идентификационные данные:</strong> фамилия, имя, отчество, индивидуальный идентификационный номер (ИИН) или бизнес-идентификационный номер (БИН) юридического лица/ИП.
              </li>
              <li>
                <strong className="text-brand-green">Контактные реквизиты:</strong> номер мобильного телефона, адрес электронной почты (email), почтовый/юридический адрес.
              </li>
              <li>
                <strong className="text-brand-green">Бухгалтерские и первичные данные:</strong> банковские реквизиты (IBAN, КБЕ, БИК банка), сведения об операциях, акты выполненных работ, электронные счета-фактуры (ЭСФ), договоры, если они загружаются клиентом для целей бухгалтерского обслуживания.
              </li>
              <li>
                <strong className="text-brand-green">Технические метаданные:</strong> IP-адрес, тип браузера и операционной системы, дата и время входа, сессионные маркеры аутентификации (подробнее в <Link to={ROUTES.COOKIE_POLICY} className="text-brand-green font-bold underline">Политике cookies</Link>).
              </li>
            </ul>
          </section>

          {/* 4. Цели обработки */}
          <section className="space-y-4">
            <h2 className="text-2xl font-black text-brand-green uppercase tracking-tight flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-brand-green/10 text-brand-green text-sm flex items-center justify-center font-bold">4</span>
              Цели сбора и обработки данных
            </h2>
            <p>Обработка персональных данных ограничивается достижением конкретных, заранее определенных целей:</p>
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-brand-green/10 bg-brand-beige/30">
                <h3 className="font-bold text-brand-green text-sm mb-1">Оказание услуг</h3>
                <p className="text-xs text-brand-green/80">Ведение бухгалтерского и налогового учета, сдача отчетности в КГД МФ РК, выставление счетов.</p>
              </div>
              <div className="p-4 rounded-xl border border-brand-green/10 bg-brand-beige/30">
                <h3 className="font-bold text-brand-green text-sm mb-1">Предоставление SaaS-доступа</h3>
                <p className="text-xs text-brand-green/80">Создание личного кабинета, авторизация, двухфакторная аутентификация (2FA) и управление задачами.</p>
              </div>
              <div className="p-4 rounded-xl border border-brand-green/10 bg-brand-beige/30">
                <h3 className="font-bold text-brand-green text-sm mb-1">Клиентская поддержка</h3>
                <p className="text-xs text-brand-green/80">Информирование о статусе задач, изменениях в тарифах и регламентах работы.</p>
              </div>
              <div className="p-4 rounded-xl border border-brand-green/10 bg-brand-beige/30">
                <h3 className="font-bold text-brand-green text-sm mb-1">Безопасность и аудит</h3>
                <p className="text-xs text-brand-green/80">Предотвращение несанкционированного доступа, защита от взлома и соблюдение требований законодательства РК.</p>
              </div>
            </div>
          </section>

          {/* 5. Права субъекта */}
          <section className="space-y-4">
            <h2 className="text-2xl font-black text-brand-green uppercase tracking-tight flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-brand-green/10 text-brand-green text-sm flex items-center justify-center font-bold">5</span>
              Права субъекта персональных данных
            </h2>
            <p>В соответствии со статьей 24 Закона РК № 94-V, каждый Пользователь имеет право:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                <span>Получать подтверждение факта обработки его данных Оператором и знакомиться с их составом.</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                <span>Требовать уточнения, блокирования или уничтожения своих персональных данных при наличии законных оснований.</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                <span>Отозвать согласие на сбор и обработку персональных данных, направив письменное уведомление Оператору.</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                <span>Обжаловать неправомерные действия или бездействие Оператора в уполномоченный орган (МЦРИАП РК) или судебные органы.</span>
              </li>
            </ul>
          </section>

          {/* 6. Сроки хранения */}
          <section className="space-y-4">
            <h2 className="text-2xl font-black text-brand-green uppercase tracking-tight flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-brand-green/10 text-brand-green text-sm flex items-center justify-center font-bold">6</span>
              Сроки хранения и порядок уничтожения
            </h2>
            <p>
              6.1. Персональные данные хранятся не дольше, чем этого требуют цели их обработки, либо в течение срока действия договора с клиентом.
            </p>
            <p>
              6.2. Документы бухгалтерского и налогового учета хранятся в течение 5 (пяти) лет в соответствии с требованиями Налогового кодекса Республики Казахстан и Закона РК «О бухгалтерском учете и финансовой отчетности».
            </p>
            <p>
              6.3. По истечении срока хранения либо при получении законного отзыва согласия данные уничтожаются безопасным программным способом без возможности восстановления.
            </p>
          </section>

          {/* 7. Контакты DPO */}
          <section className="space-y-4 pt-4 border-t border-brand-green/10">
            <h2 className="text-2xl font-black text-brand-green uppercase tracking-tight flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-brand-green/10 text-brand-green text-sm flex items-center justify-center font-bold">7</span>
              Реквизиты Оператора и контакты DPO
            </h2>
            <div className="p-6 rounded-2xl bg-brand-beige/40 border border-brand-green/15 text-sm space-y-2">
              <p><strong>Наименование:</strong> ТОО «ЖАН FINANCE»</p>
              <p><strong>БИН:</strong> 240140023819</p>
              <p><strong>Адрес:</strong> Республика Казахстан, г. Шымкент, ул. Байтерекова, 79а / г. Алматы, пр. Достык, 180</p>
              <p><strong>Ответственный за защиту данных (DPO):</strong> Служба комплаенс и информационной безопасности</p>
              <p><strong>Электронная почта:</strong> <a href="mailto:privacy@zhanfinance.kz" className="underline font-bold text-brand-green">privacy@zhanfinance.kz</a>, <a href="mailto:zhan.finance@gmail.com" className="underline text-brand-green">zhan.finance@gmail.com</a></p>
              <p><strong>Контактный телефон:</strong> +7-775-957-37-87</p>
            </div>
          </section>

        </div>

        {/* Simple Document Footer */}
        <div className="mt-10 text-center text-xs text-brand-green/60">
          ТОО «ЖАН FINANCE» • БИН 240140023819 • Все права защищены
        </div>
      </div>
    </main>
  );
}
