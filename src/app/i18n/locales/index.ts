import { en, type Translations } from './en';
import { type SupportedLocale } from '../types';

export const dictionaries: Record<SupportedLocale, Translations> = {
  'en-US': en,
};

export { en };
export type { Translations };
