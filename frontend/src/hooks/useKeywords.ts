import { useState } from "react";

export function useKeywords(initial: string[] = []) {
  const [keywords, setKeywords] = useState<string[]>(initial);

  const addKeyword = (keyword: string) => {
    const trimmed = keyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const clearKeywords = () => setKeywords([]);

  return { keywords, addKeyword, removeKeyword, clearKeywords };
}
