import { NextRequest, NextResponse } from "next/server";
import { CATEGORY_LABELS, PRIORITY_LABELS } from "@/types";
import { suggestCategory, suggestPriority } from "@/lib/chatbot/knowledge-base";

export const dynamic = "force-dynamic";

/**
 * Este endpoint só é chamado quando:
 *  1. A pergunta não bateu com nenhuma intenção estruturada
 *     (abrir ticket / consultar ticket / consultar SLA), e
 *  2. A base de conhecimento local não tinha uma resposta pronta.
 *
 * Por isso o prompt é deliberadamente curto e o limite de tokens baixo:
 * o objetivo é uma resposta objetiva de suporte de TI, não uma conversa
 * aberta. Isso mantém o custo de IA próximo de zero no uso normal do
 * chatbot, já que a maioria das perguntas é resolvida antes de chegar aqui.
 *
 * IA usada: Google Gemini via Google AI Studio (gemini-2.5-flash).
 * Plano gratuito, sem cartão de crédito. Chave gerada em
 * https://aistudio.google.com/apikey e configurada como GEMINI_API_KEY
 * em .env.local.
 */

const SYSTEM_PROMPT = `Você é o assistente de suporte de TI de uma empresa. Responda de forma curta e direta, no máximo 3 frases, em português do Brasil. Se a pergunta não for sobre suporte de TI (hardware, software, rede, acesso, sistemas internos), diga educadamente que você só pode ajudar com assuntos de TI. Nunca invente políticas internas, números de ticket ou prazos que não foram informados a você.`;

const GEMINI_MODEL = "gemini-2.5-flash";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = (body?.message ?? "").toString().trim();

    if (!message) {
      return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          reply:
            "Não consegui localizar essa resposta na nossa base de conhecimento, e o assistente de IA não está configurado no momento. Posso abrir um ticket para que o time de suporte responda diretamente?",
          source: "fallback",
        },
        { status: 200 }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: {
            maxOutputTokens: 220,
            temperature: 0.3,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json(
        {
          reply:
            "Tive um problema para consultar o assistente de IA agora. Posso abrir um ticket para o time de suporte te ajudar diretamente?",
          source: "fallback",
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    const reply: string =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        ?.join("\n")
        ?.trim() || "Não consegui gerar uma resposta agora. Pode tentar reformular a pergunta?";

    const category = suggestCategory(message);
    const priority = suggestPriority(message);

    return NextResponse.json({
      reply,
      source: "ai",
      suggestedCategory: category,
      suggestedCategoryLabel: CATEGORY_LABELS[category],
      suggestedPriority: priority,
      suggestedPriorityLabel: PRIORITY_LABELS[priority],
    });
  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json(
      { error: "Erro interno ao processar a mensagem." },
      { status: 500 }
    );
  }
}
