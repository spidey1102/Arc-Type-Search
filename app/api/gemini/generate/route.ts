import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, model } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on server' },
        { status: 500 }
      );
    }

    // Initialize Google GenAI client
    const ai = new GoogleGenAI({ apiKey });

    // Request answer from Gemini
    const response = await ai.models.generateContent({
      model: model || 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are Arc Assistant, an ultra-fast, helpful desktop AI. Answer concisely in 1 to 3 sentences or quick bullet points. Be precise, avoid fluff.',
      },
    });

    const text = response.text || '';
    return NextResponse.json({ text, provider: 'gemini-2.5-flash' });
  } catch (error: any) {
    console.error('Gemini generate error:', error?.message || error);

    // Fallback: Check if OpenRouter is configured or try OpenRouter with free Gemma 2
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      try {
        const { prompt } = await req.json().catch(() => ({ prompt: '' }));
        const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemma-2-9b-it:free',
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (openRouterRes.ok) {
          const data = await openRouterRes.json();
          const fallbackText = data.choices?.[0]?.message?.content;
          if (fallbackText) {
            return NextResponse.json({ text: fallbackText, provider: 'gemma-2-9b-free' });
          }
        }
      } catch (orErr) {
        console.warn('OpenRouter fallback error:', orErr);
      }
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to generate answer' },
      { status: 500 }
    );
  }
}
