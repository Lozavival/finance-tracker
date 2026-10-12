import { en, type Translations } from './en';
import { pt } from './pt';
import { type SupportedLocale } from '../types';

export const dictionaries: Record<SupportedLocale, Translations> = {
  'en-US': en,
  'pt-BR': pt,
};

export { en };
export type { Translations };
