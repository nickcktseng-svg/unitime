"use client";

import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      try {
        setValue(JSON.parse(raw) as T);
      } catch {
        setValue(initialValue);
      }
    }
    setIsLoaded(true);
  }, [initialValue, key]);

  useEffect(() => {
    if (isLoaded) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, [isLoaded, key, value]);

  return [value, setValue, isLoaded] as const;
}
