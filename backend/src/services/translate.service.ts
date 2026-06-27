import { Translate } from '@google-cloud/translate/build/src/v2/index.js';
import type { SrtEntry } from '../types/index';

const translator = new Translate({ key: process.env.GOOGLE_TRANSLATE_API_KEY });

export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text.trim()) return text;
  const [translation] = await translator.translate(text, targetLang);
  return Array.isArray(translation) ? translation[0] : translation;
}

export async function translateSrt(
  entries: SrtEntry[],
  targetLang: string,
): Promise<SrtEntry[]> {
  if (entries.length === 0) return [];

  const texts = entries.map((e) => e.text);

  const [translations] = await translator.translate(texts, targetLang);

  const results = Array.isArray(translations) ? translations : [translations];

  return entries.map((entry, i) => ({
    ...entry,
    text: results[i] ?? entry.text,
  }));
}
