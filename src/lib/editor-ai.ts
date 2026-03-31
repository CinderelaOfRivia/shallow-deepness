import { z } from "zod";
import type { AiIntensity, AiWorkflow, ArticleAiOutput, ArticleDraftInput } from "@/lib/types";

const XAI_API_URL = process.env.XAI_API_URL ?? "https://api.x.ai/v1/chat/completions";
const XAI_API_KEY = process.env.XAI_API_KEY;
const DEFAULT_MODEL = process.env.XAI_MODEL_DEFAULT ?? "grok-4.1-fast-reasoning";
const HEAVY_MODEL = process.env.XAI_MODEL_HEAVY ?? "grok-4.2-reasoning";

const aiOutputSchema = z.object({
  headline: z.string().min(1).max(160),
  summary: z.string().min(1).max(4000),
  preserve: z.array(z.string().min(1).max(300)).max(8),
  strengths: z.array(z.string().min(1).max(300)).max(8),
  tensions: z.array(z.string().min(1).max(300)).max(8),
  action_items: z.array(z.string().min(1).max(300)).max(8),
  counterpoints: z.array(z.string().min(1).max(300)).max(8),
  confidence_note: z.string().max(300).nullable(),
  suggested_article: z
    .object({
      title: z.string().min(1).max(220).optional(),
      subtitle: z.string().max(240).nullable().optional(),
      excerpt: z.string().min(1).max(1200).optional(),
      body_md: z.string().min(1).max(60000).optional(),
      seo_title: z.string().max(220).nullable().optional(),
      seo_description: z.string().max(320).nullable().optional(),
    })
    .nullable(),
});

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

export function hasXaiEnv() {
  return Boolean(XAI_API_KEY);
}

export function resolveXaiModel(intensity: AiIntensity) {
  return intensity === "heavy" ? HEAVY_MODEL : DEFAULT_MODEL;
}

function getWorkflowLabel(workflow: AiWorkflow) {
  switch (workflow) {
    case "feedback":
      return "feedback";
    case "steelman":
      return "steelman";
    case "editorial":
      return "editorial";
  }
}

function buildSystemPrompt(workflow: AiWorkflow) {
  const shared = [
    "You are the editorial intelligence inside an anonymous philosophy journal called Shallow Deepness.",
    "Your job is to improve writing without flattening the author's strange angles, sharpness, or reasonable tangents.",
    "Do not sanitize the voice into generic polished blog sludge.",
    "Preserve the author's weird takes when they are coherent, interesting, or productively provocative.",
    "Never inject personal details, identity markers, or autobiographical claims that are not already in the draft.",
    "Return only valid JSON matching the requested schema. No markdown fences. No preamble.",
  ];

  if (workflow === "feedback") {
    shared.push(
      "Feedback mode: diagnose clarity, structure, overreach, ambiguity, unsupported leaps, and what is strongest.",
      "Offer sharp but constructive feedback. The suggested_article should be a light-touch revision, not a full rewrite, unless the draft is structurally collapsing.",
    );
  }

  if (workflow === "steelman") {
    shared.push(
      "Steelman mode: build the strongest fair-minded critique against the draft, identify hidden assumptions, and show what a smart critic would attack.",
      "The suggested_article should fortify the original argument rather than replace it with the critic's position.",
    );
  }

  if (workflow === "editorial") {
    shared.push(
      "Editorial mode: rewrite for flow, precision, rhythm, and readability while preserving the author's essence.",
      "Do not homogenize the tone. Keep the edge. Keep the odd but meaningful turns. Improve only what makes the piece read stronger.",
      "In this mode, suggested_article should usually include title, excerpt, and body_md.",
    );
  }

  return shared.join("\n");
}

function buildUserPrompt(workflow: AiWorkflow, draft: ArticleDraftInput) {
  const schemaDescription = {
    headline: "short title for this AI pass",
    summary: "dense overview of the diagnosis or rewrite",
    preserve: ["what must not be lost from the author's voice or argument"],
    strengths: ["what is already working"],
    tensions: ["weaknesses, ambiguities, or risks"],
    action_items: ["specific next edits to make"],
    counterpoints: ["strongest critique or pressure points"],
    confidence_note: "optional short note about uncertainty or tradeoffs",
    suggested_article: {
      title: "optional revised title",
      subtitle: "optional revised subtitle or null",
      excerpt: "optional revised excerpt",
      body_md: "optional revised body in markdown",
      seo_title: "optional revised SEO title or null",
      seo_description: "optional revised SEO description or null",
    },
  };

  return [
    `Workflow: ${getWorkflowLabel(workflow)}`,
    "Return JSON matching this shape exactly:",
    JSON.stringify(schemaDescription, null, 2),
    "",
    "Current draft:",
    JSON.stringify(draft, null, 2),
    "",
    "Critical constraints:",
    "- Preserve the author's essence, weirdness, and sharp angles when they are reasonable.",
    "- Prefer specific criticism over vague praise.",
    "- If rewriting, keep the prose recognizably the same mind, just cleaner and stronger.",
    "- Do not over-correct into corporate, academic, or sanitized language.",
  ].join("\n");
}

function extractTextContent(content: unknown) {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text;
        }
        return "";
      })
      .join("\n");
  }

  return "";
}

function extractJsonBlock(raw: string) {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1).trim();
  }

  return raw.trim();
}

export async function runArticleAiWorkflow({
  workflow,
  intensity,
  draft,
}: {
  workflow: AiWorkflow;
  intensity: AiIntensity;
  draft: ArticleDraftInput;
}): Promise<{ model_name: string; output: ArticleAiOutput }> {
  if (!XAI_API_KEY) {
    throw new Error("Falta XAI_API_KEY en el entorno.");
  }

  const model = resolveXaiModel(intensity);
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(workflow) },
    { role: "user", content: buildUserPrompt(workflow, draft) },
  ];

  const response = await fetch(XAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: workflow === "editorial" ? 0.55 : 0.3,
      messages,
    }),
    signal: AbortSignal.timeout(90000),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`xAI request failed (${response.status}): ${detail.slice(0, 600)}`);
  }

  const data = await response.json();
  const rawContent = extractTextContent(data?.choices?.[0]?.message?.content);
  const jsonText = extractJsonBlock(rawContent);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("xAI devolvió una respuesta no parseable como JSON.");
  }

  const output = aiOutputSchema.parse(parsed);
  return { model_name: model, output };
}
