/**
 * Shared constants for the OpenFEC MCP server.
 */

/** Base URL for the OpenFEC REST API (version 1). */
export const API_BASE_URL = "https://api.open.fec.gov/v1";

/**
 * Maximum size (in characters) of a tool's text response. Responses larger
 * than this are truncated with a message instructing the agent to paginate
 * or add filters. Keeps large result sets from overwhelming the context.
 */
export const CHARACTER_LIMIT = 25000;

/** Default request timeout in milliseconds. */
export const REQUEST_TIMEOUT_MS = 30000;

/**
 * Environment variable that holds the api.data.gov API key used to
 * authenticate with the OpenFEC API. Register for a free key at
 * https://api.open.fec.gov/developers/. Falls back to "DEMO_KEY" (heavily
 * rate limited) when unset.
 */
export const API_KEY_ENV = "OPENFEC_API_KEY";

/** api.data.gov demo key used when no real key is configured. */
export const DEMO_API_KEY = "DEMO_KEY";
