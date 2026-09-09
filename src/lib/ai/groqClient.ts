import Groq from 'groq-sdk';

let groqInstance: Groq | null = null;

export function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_groq_api_key_here')) {
    return null;
  }

  if (!groqInstance) {
    groqInstance = new Groq({
      apiKey: apiKey.trim(),
    });
  }

  return groqInstance;
}

export const GROQ_MODELS = {
  PRIMARY_REASONING: 'openai/gpt-oss-120b',
  FAST_INFERENCE: 'openai/gpt-oss-20b',
};
