import { createGateway } from "ai";

export const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

export const DEFAULT_MODEL = "openai/gpt-4o";
