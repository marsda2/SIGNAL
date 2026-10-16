// Server-only. The one place the LLM provider is chosen: Gemini 3.8 Flash with medium thinking by default.
import { createGoogleGenerativeAI, type GoogleLanguageModelOptions } from '@ai-sdk/google';

const apiKey = () => process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

export const hasModelKey = () => Boolean(apiKey());

export const modelId = () => process.env.AI_MODEL?.trim() || 'gemini-3.8-flash';

type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';
const thinkingLevel = (): ThinkingLevel => {
  const v = process.env.AI_THINKING_LEVEL?.trim();
  return v === 'minimal' || v === 'low' || v === 'high' ? v : 'medium';
};

export function chatModel() {
  return createGoogleGenerativeAI({ apiKey: apiKey() })(modelId());
}

export function chatProviderOptions() {
  return { google: { thinkingConfig: { thinkingLevel: thinkingLevel() } } satisfies GoogleLanguageModelOptions };
}
