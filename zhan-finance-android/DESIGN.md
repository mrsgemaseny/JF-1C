# DESIGN.md — ZHAN FINANCE Android Mobile Client

## 1. Философия и Визуальный Канон (Light Enterprise SaaS)
Интерфейс мобильного клиента строго унифицирован со светлым корпоративным рабочим пространством веб-CRM (кабинет):
- **Canvas (основной фон рабочих экранов)**: `#F9FAFB` (`bg-gray-50`)
- **Surface (карточки, панели, навигация)**: `#FFFFFF` (`bg-white`)
- **Border (разделители и контуры карточек)**: `#E5E7EB` (`border-gray-200`)
- **Типографика**:
  - Основной текст: `#111827` (`text-gray-900`)
  - Вторичный текст и метки: `#6B7280` (`text-gray-500`)
  - Плейсхолдеры и неактивные элементы: `#9CA3AF` (`text-gray-400`)
- **Primary Accent**: `#00562D` (основные действия, активные вкладки, кнопки)
- **Brand Beige**: `#F5F5DC` используется ИСКЛЮЧИТЕЛЬНО на экранах авторизации (login, register). Внутри кабинета фон нейтральный серый `#F9FAFB`.
- **Семантические тона статусов (StatusBadge)**:
  - emerald: `bg-emerald-50 border-emerald-200 text-emerald-800`
  - amber: `bg-amber-50 border-amber-200 text-amber-800`
  - red: `bg-red-50 border-red-200 text-red-800`
  - blue: `bg-blue-50 border-blue-200 text-blue-800`
  - zinc: `bg-gray-100 border-gray-200 text-gray-700`
  - Поддержка динамического цвета стадии с бэкенда (`stage.color` в формате hex).

## 2. Иерархия типографики
Иерархия строится через стандартный регистр (без навязчивого UPPERCASE) и четкий контраст серого:
1. **Заголовки экранов**: `text-2xl font-bold text-gray-900`, обычный регистр.
2. **Заголовки карточек и разделов**: `text-base font-bold text-gray-900`.
3. **Основной контент и кнопки**: `text-sm font-semibold` или `font-medium text-gray-900`.
4. **Метаданные, подписи полей, даты**: `text-xs font-medium text-gray-500`.
5. **Бейджи**: `text-xs font-semibold`.

## 3. Геометрия, Компоненты и Интерактивность
- **Радиусы**: `rounded-xl` (12px) для карточек, инпутов и кнопок; `rounded-full` для статусных бейджей и чипов.
- **Тени**: легкие сдержанные тени `shadow-sm` на карточках `SurfaceCard`.
- **Инпуты (AppInput)**: `min-h-[46px]`, `border-gray-200`, фокус `border-[#00562D]`, текст `text-gray-900`.
- **Кнопки (AppButton)**: `min-h-[46px]`, `rounded-xl`, `text-sm font-semibold`, без капса.
- **Таб-бар**: `bg-white`, верхняя граница `#E5E7EB`, активный цвет `#00562D`, неактивный `#9CA3AF`.
- **Touch Targets**: Минимальная зона нажатия интерактивных элементов — `44x44dp`.
- **Запреты**: Категорический запрет на эмодзи в UI, коде и комментариях.
