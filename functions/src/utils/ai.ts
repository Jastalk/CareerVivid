import { GoogleGenAI } from "@google/genai";
import {
  ConversationalSearchServiceClient,
  SearchServiceClient,
} from "@google-cloud/discoveryengine";

export const DEFAULT_VERTEX_TEXT_MODEL = process.env.DEFAULT_VERTEX_TEXT_MODEL || "gemini-3.6-flash";

export const GCP_PROJECT_ID =
  process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "jastalk-firebase";

/**
 * Discovery Engine multi-region.
 *
 * This is NOT the same axis as GOOGLE_CLOUD_LOCATION. Agent Builder only serves
 * `global`, `us` and `eu` — passing a compute region such as `us-west1` produces
 * a host that does not resolve, so it is deliberately kept separate from
 * getVertexLocationForModel() below.
 */
export const ENTERPRISE_LOCATION = process.env.ENTERPRISE_LOCATION || "global";

/** Datastore ids, injected per environment by scripts/setup-enterprise-datastores.mjs. */
export const ENTERPRISE_DATASTORES = {
  jobCatalog: process.env.ENTERPRISE_DATASTORE_JOB_CATALOG || "careervivid-job-catalog",
  rubrics: process.env.ENTERPRISE_DATASTORE_RUBRICS || "careervivid-interview-rubrics",
} as const;

export type EnterpriseDatastoreKey = keyof typeof ENTERPRISE_DATASTORES;

/** `global` is served from the apex host; every other multi-region is prefixed. */
function discoveryEngineApiEndpoint(location: string): string {
  return location === "global"
    ? "discoveryengine.googleapis.com"
    : `${location}-discoveryengine.googleapis.com`;
}

/**
 * Clients are cached per location. Each constructor opens a gRPC channel and
 * resolves ADC, which is wasteful to redo on every warm invocation.
 */
const enterpriseClientCache = new Map<
  string,
  { conversational: ConversationalSearchServiceClient; search: SearchServiceClient }
>();

/**
 * Returns the Agent Builder (Discovery Engine) clients, authenticated with the
 * Cloud Function's Application Default Credentials.
 *
 * The service account needs `roles/discoveryengine.user` and `roles/aiplatform.user`
 * — nothing broader.
 */
export function getEnterpriseAgentClient(location: string = ENTERPRISE_LOCATION): {
  conversational: ConversationalSearchServiceClient;
  search: SearchServiceClient;
} {
  const cached = enterpriseClientCache.get(location);
  if (cached) return cached;

  const options = { apiEndpoint: discoveryEngineApiEndpoint(location) };
  const clients = {
    conversational: new ConversationalSearchServiceClient(options),
    search: new SearchServiceClient(options),
  };
  enterpriseClientCache.set(location, clients);
  return clients;
}

/**
 * Fully-qualified serving config for a datastore's default search config.
 *
 * Built by hand rather than with the generated path helper because the helper
 * requires a collection segment that the default `global` datastore layout
 * always fills with `default_collection`.
 */
export function enterpriseServingConfigPath(
  datastoreId: string,
  location: string = ENTERPRISE_LOCATION
): string {
  return (
    `projects/${GCP_PROJECT_ID}/locations/${location}/collections/default_collection` +
    `/dataStores/${datastoreId}/servingConfigs/default_search`
  );
}

/** Parent path used when creating or listing datastores. */
export function enterpriseCollectionPath(location: string = ENTERPRISE_LOCATION): string {
  return `projects/${GCP_PROJECT_ID}/locations/${location}/collections/default_collection`;
}

export function resolveVertexModelName(model?: string): string {
  return model || DEFAULT_VERTEX_TEXT_MODEL;
}

export function getVertexLocationForModel(model?: string): string {
  return process.env.GOOGLE_CLOUD_LOCATION || process.env.GCLOUD_LOCATION || "us-central1";
}

/**
 * Returns a configured GoogleGenAI instance.
 * Defaults to using Vertex AI (no API key needed) for server-side requests
 * using Application Default Credentials (ADC).
 * Optionally accepts a client-provided apiKey (e.g., from a user's CareerVivid session).
 */
export function getAIClient(apiKey?: string, location = getVertexLocationForModel()): GoogleGenAI {
  // If an explicit API key is provided and it's NOT a CareerVivid proxy key, use it directly
  if (apiKey && !apiKey.startsWith('cv_live_')) {
    return new GoogleGenAI({ apiKey });
  }
  
  // Otherwise, use Vertex AI with default credentials
  // This automatically uses the service account attached to the Cloud Function
  return new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "jastalk-firebase",
    location
  });
}
