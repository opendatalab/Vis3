import { useEffect, useState } from 'react';

const serialize = (data: unknown) => {
  if (typeof data === 'string') {
    return data;
  }

  return JSON.stringify(data);
};

const deserialize = (data: string, fallback: unknown) => {
  try {
    return JSON.parse(data);
  } catch (_unused) {
    return data ?? fallback;
  }
};

export const useLocalStorage = <T,>(key: string, value: T | (() => T)) => {
  const getInitialValue = () => (typeof value === 'function' ? (value as () => T)() : value);

  const [state, setState] = useState<T>(() => {
    const initialValue = getInitialValue();

    try {
      const localStorageValue = localStorage.getItem(key);
      if (typeof localStorageValue !== 'string') {
        localStorage.setItem(key, serialize(initialValue));
        return initialValue;
      }

      return deserialize(localStorageValue, initialValue) as T;
    } catch (_unused) {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(state));
    } catch (_unused) {
    }
  }, [key, state]);

  return [state, setState] as const;
};
