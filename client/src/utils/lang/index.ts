import { langService } from '~/service/lang';
import * as cn from './cn';
import * as en from './en';

export const lang = langService.createLangLoader({
  en,
  'zh-cn': cn,
});
