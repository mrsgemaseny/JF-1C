import { describe, it, expect } from 'vitest';
import { resources } from '@/shared/i18n/i18n';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, nextKey));
    } else {
      keys.push(nextKey);
    }
  }
  return keys.sort();
}

describe('4-Language i18n Parity (ru, kk, en, zh)', () => {
  it('maintains 100% key parity across ru, kk, en, and zh', () => {
    const ruKeys = flattenKeys(resources.ru.translation);
    const kkKeys = flattenKeys(resources.kk.translation);
    const enKeys = flattenKeys(resources.en.translation);
    const zhKeys = flattenKeys(resources.zh.translation);

    expect(kkKeys).toEqual(ruKeys);
    expect(enKeys).toEqual(ruKeys);
    expect(zhKeys).toEqual(ruKeys);
  });

  it('contains zero Cyrillic characters in Chinese (zh) translations', () => {
    const zhValues = JSON.stringify(resources.zh.translation);
    expect(/[а-яА-ЯёЁәіңғүұқөһӘІҢҒҮҰҚӨҺ]/.test(zhValues)).toBe(false);
  });
});
