import { LocalStorage } from 'node-localstorage';

const localStorage = new LocalStorage('./localStorage');

export const store = (key: string, data?: any) => {
  if (!data && data !== '') {
    const value = localStorage.getItem(key);
    try {
      return JSON.parse(value || '');
    } catch (_) {
      return value;
    }
  }
  localStorage.setItem(key, JSON.stringify(data, null, 2));
};
