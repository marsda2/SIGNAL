// Server-only. The one place the LLM provider is chosen: Gemini 3.8 Flash with medium thinking by default.
import { createGoogleGenerativeAI, type GoogleLanguageModelOptions } from '@ai-sdk/google';

const apiKey = () => process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

export const hasModelKey = () => Boolean(apiKey());

export const modelId = () => process.env.AI_MODEL?.trim() || 'gemini-3.8-flash';
export const fallbackModelId = () => process.env.AI_FALLBACK_MODEL?.trim() || 'gemini-3.5-flash-lite';

type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';
const thinkingLevel = (): ThinkingLevel => {
  const v = process.env.AI_THINKING_LEVEL?.trim();
  return v === 'minimal' || v === 'low' || v === 'high' ? v : 'medium';
};

export function chatModel(id = modelId()) {
  return createGoogleGenerativeAI({ apiKey: apiKey() })(id);
}

export function chatProviderOptions(id = modelId()) {
  if (id === 'gemini-3.5-flash-lite') {
    return { google: { thinkingConfig: { thinkingLevel: 'minimal' } } satisfies GoogleLanguageModelOptions };
  }
  if (id.startsWith('gemini-2.5-flash')) {
    return { google: { thinkingConfig: { thinkingBudget: 0 } } satisfies GoogleLanguageModelOptions };
  }
  return { google: { thinkingConfig: { thinkingLevel: thinkingLevel() } } satisfies GoogleLanguageModelOptions };
}
