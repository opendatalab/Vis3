import translation_en_us from './en-US.json';
import translation_zh_cn from './zh-CN.json';

export const resources = {
  'en-US': {
    translation: translation_en_us as Record<string, unknown>,
  },
  'zh-CN': {
    translation: translation_zh_cn as Record<string, unknown>,
  },
} as Record<string, { translation: Record<string, unknown> }>;

export const SUPPORTED_LANGUAGES = ['en-US', 'zh-CN']

export type SupportedLanguage = keyof typeof resources