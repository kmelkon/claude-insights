import pLimit from "p-limit";
import type { SessionEntry, SessionFacet, LLMSynthesis, ProjectAnalysis } from "../types.js";
import { readFacet, writeFacet, clearCache as clearFacetCache } from "../llm/cache.js";
import { getFacetExtractionPrompt, getSynthesisPrompt } from "../llm/prompts.js";
import { callLLM, defaultModel } from "../llm/client.js";
import { readCondensedTranscript } from "../readers/transcripts.js";

interface AnalyzeLLMOptions {
  maxSessions: number;
  concurrency: number;
  clearCache: boolean;
  projects?: ProjectAnalysis[];
  onProgress?: (done: number, total: number) => void;
}

export async function analyzeLLM(
  sessions: SessionEntry[],
  options: AnalyzeLLMOptions
): Promise<{ synthesis: LLMSynthesis; facets: SessionFacet[] }> {
  if (options.clearCache) clearFacetCache();

  const eligible = sessions
    .filter((s) => s.messageCount >= 3)
    .filter((s) => new Date(s.modified).getTime() - new Date(s.created).getTime() >= 60_000)
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, options.maxSessions);

  const limit = pLimit(options.concurrency);
  let done = 0;

  const facetResults = await Promise.all(
    eligible.map((session) =>
      limit(async (): Promise<SessionFacet | null> => {
        try {
          const cached = readFacet(session.sessionId);
          if (cached) {
            done++;
            options.onProgress?.(done, eligible.length);
            return cached;
          }

          const transcript = readCondensedTranscript(session.fullPath);
          if (!transcript.turns.length) {
            done++;
            options.onProgress?.(done, eligible.length);
            return null;
          }

          const { system, content } = getFacetExtractionPrompt(transcript);
          const raw = await callLLM({ model: defaultModel, system, content });
          if (!raw) {
            done++;
            options.onProgress?.(done, eligible.length);
            return null;
          }

          const facet = JSON.parse(extractJSON(raw)) as SessionFacet;
          facet.sessionId = session.sessionId;
          writeFacet(session.sessionId, facet);

          done++;
          options.onProgress?.(done, eligible.length);
          return facet;
        } catch {
          done++;
          options.onProgress?.(done, eligible.length);
          return null;
        }
      })
    )
  );

  const facets = facetResults.filter((f): f is SessionFacet => f !== null);

  const { system, content } = getSynthesisPrompt(facets, sessions.length, options.projects);
  const synthRaw = await callLLM({ model: defaultModel, system, content, maxTokens: 8192 });

  let synthesis: LLMSynthesis;
  try {
    synthesis = JSON.parse(extractJSON(synthRaw)) as LLMSynthesis;
  } catch {
    synthesis = {
      atAGlance: { whatsWorking: "", whatsHindering: "", quickWins: "", ambitiousWorkflows: "" },
      impressiveThings: [],
      whereThingsGoWrong: [],
      featuresToTry: [],
    };
  }

  return { synthesis, facets };
}

function extractJSON(raw: string): string {
  let s = raw.trim();
  // Remove markdown fences
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```\s*$/, "");
  }
  // If it doesn't start with {, try to find the first {
  if (!s.startsWith("{")) {
    const idx = s.indexOf("{");
    if (idx !== -1) s = s.slice(idx);
  }
  // If it doesn't end with }, try to find the last }
  if (!s.endsWith("}")) {
    const idx = s.lastIndexOf("}");
    if (idx !== -1) s = s.slice(0, idx + 1);
  }
  return s;
}
