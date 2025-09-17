const REQUIRED_ENV_VARS = [
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
  'UPSTASH_SEARCH_REST_URL',
  'UPSTASH_SEARCH_REST_TOKEN',
  'JWT_SECRET'
] as const;

type EnvVar = typeof REQUIRED_ENV_VARS[number];

/**
 * Gets an environment variable value and ensures it exists
 * @throws Error if the variable is not defined
 */
function getRequiredEnv(name: EnvVar): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not defined`);
  }
  return value;
}

/**
 * Validates that all required environment variables are set and have valid values.
 * @throws Error if any required variable is missing or invalid
 */
export function validateEnvironment(): void {
  const missing = REQUIRED_ENV_VARS.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate URL formats
  const kvUrl = getRequiredEnv('KV_REST_API_URL');
  if (!kvUrl.startsWith('https://')) {
    throw new Error('KV_REST_API_URL must be a valid HTTPS URL');
  }
  
  const searchUrl = getRequiredEnv('UPSTASH_SEARCH_REST_URL');
  if (!searchUrl.startsWith('https://')) {
    throw new Error('UPSTASH_SEARCH_REST_URL must be a valid HTTPS URL');
  }
  
  // Validate token lengths
  const kvToken = getRequiredEnv('KV_REST_API_TOKEN');
  if (kvToken.length < 32) {
    throw new Error('KV_REST_API_TOKEN is too short');
  }
  
  const searchToken = getRequiredEnv('UPSTASH_SEARCH_REST_TOKEN');
  if (searchToken.length < 32) {
    throw new Error('UPSTASH_SEARCH_REST_TOKEN is too short');
  }
  
  const jwtSecret = getRequiredEnv('JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  console.log('[v0] Environment validation successful');
}