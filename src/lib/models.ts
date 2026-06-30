// Model presets surfaced in the composer dropdown. The `id` is sent to the
// gateway as the OpenAI-compatible `model`; the gateway routes to the org's
// configured backend (cloud or self-hosted) per policy, so these map to
// whatever the upstream exposes.

export interface ModelOption {
  id: string;
  label: string;
  sub: string;
}

// IDs are passed straight through to the gateway's "cloud" upstream, so they must
// be valid models for whatever OPENAI_BASE_URL points at. Currently wired to Groq.
// DeepSeek swap: { id: "deepseek-chat", … } / { id: "deepseek-reasoner", … }.
export const MODELS: ModelOption[] = [
  { id: "llama-3.1-8b-instant", label: "Fast", sub: "Quick everyday answers" },
  { id: "llama-3.3-70b-versatile", label: "Expert", sub: "Deeper reasoning" },
];

export const DEFAULT_MODEL = MODELS[0];
