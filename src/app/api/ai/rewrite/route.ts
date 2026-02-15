import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const MAX_INPUT_CHARS = 8000;
const DEFAULT_MODEL = "gpt-5";
const ERROR_MESSAGE = "AI提案の生成に失敗しました。";
const DEV_INSTRUCTION =
  "You rewrite Japanese marketing copy. Do NOT change any numbers, dates, or terms. Output ONLY the rewritten text, no markdown.";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      text?: string;
      instruction?: string;
      context?: { sectionType?: string; fieldKey?: string };
    };

    if (typeof body?.text !== "string" || typeof body?.instruction !== "string") {
      return NextResponse.json(
        { error: "無効なリクエストです。" },
        { status: 400 }
      );
    }

    const text = body.text.trim();
    const instruction = body.instruction.trim();
    if (!text) {
      return NextResponse.json(
        { error: "テキストが空です。" },
        { status: 400 }
      );
    }
    if (text.length > MAX_INPUT_CHARS) {
      return NextResponse.json(
        { error: "テキストが長すぎます。" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: ERROR_MESSAGE }, { status: 500 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
    const userContent = `目的: ${instruction || "指定なし"}\n\n原文:\n${text}`;

    const response = await client.responses.create({
      model,
      input: [
        { role: "developer", content: DEV_INSTRUCTION },
        { role: "user", content: userContent },
      ],
    });

    return NextResponse.json({ text: response.output_text ?? "" });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("AI rewrite failed:", error);
    }
    return NextResponse.json({ error: ERROR_MESSAGE }, { status: 500 });
  }
}
