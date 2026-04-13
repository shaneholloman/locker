export type RuntimeEnvironment =
  | "vercel"
  | "aws_lambda"
  | "netlify"
  | "fly"
  | "railway"
  | "render"
  | "docker"
  | "development"
  | "unknown";

export type RuntimeClass = "serverless" | "persistent";

export type PlatformStorageProviderId = "s3" | "r2" | "vercel_blob" | "local";

export interface RuntimeCapabilities {
  environment: RuntimeEnvironment;
  runtimeClass: RuntimeClass;
  localFilesystemAvailable: boolean;
  longRunningSupported: boolean;
  overridden: boolean;
  /** Set when LOCKER_RUNTIME_ENV was provided but not a valid value. */
  overrideRejected: string | null;
  /** True when a task queue backend is available for delegating long-running work. */
  taskQueueAvailable: boolean;
  platformStorageProvider: PlatformStorageProviderId | null;
  configuredPlatformStorageProvider: PlatformStorageProviderId | null;
}

const SERVERLESS_ENVIRONMENTS: ReadonlySet<RuntimeEnvironment> = new Set([
  "vercel",
  "aws_lambda",
  "netlify",
]);

const VALID_OVERRIDES: ReadonlySet<string> = new Set([
  "vercel",
  "aws_lambda",
  "netlify",
  "fly",
  "railway",
  "render",
  "docker",
  "development",
]);

function detectEnvironment(
  env: Record<string, string | undefined>,
): { environment: RuntimeEnvironment; overridden: boolean; overrideRejected: string | null } {
  const override = env.LOCKER_RUNTIME_ENV;
  if (override) {
    if (VALID_OVERRIDES.has(override)) {
      return { environment: override as RuntimeEnvironment, overridden: true, overrideRejected: null };
    }
    // Invalid override — fall through to auto-detection but record the bad value
    return detectFromPlatformVars(env, override);
  }

  return detectFromPlatformVars(env, null);
}

function detectFromPlatformVars(
  env: Record<string, string | undefined>,
  overrideRejected: string | null,
): { environment: RuntimeEnvironment; overridden: boolean; overrideRejected: string | null } {
  if (env.VERCEL) return { environment: "vercel", overridden: false, overrideRejected };
  if (env.AWS_LAMBDA_FUNCTION_NAME) return { environment: "aws_lambda", overridden: false, overrideRejected };
  if (env.NETLIFY) return { environment: "netlify", overridden: false, overrideRejected };
  if (env.FLY_REGION) return { environment: "fly", overridden: false, overrideRejected };
  if (env.RAILWAY_ENVIRONMENT) return { environment: "railway", overridden: false, overrideRejected };
  if (env.RENDER) return { environment: "render", overridden: false, overrideRejected };
  if (env.DOCKER_CONTAINER) return { environment: "docker", overridden: false, overrideRejected };
  if (env.NODE_ENV === "development") return { environment: "development", overridden: false, overrideRejected };

  return { environment: "unknown", overridden: false, overrideRejected };
}

function mapBlobStorageProvider(
  value: string | undefined,
): PlatformStorageProviderId | null {
  switch (value) {
    case "s3":
      return "s3";
    case "r2":
      return "r2";
    case "vercel":
      return "vercel_blob";
    case "local":
      return "local";
    default:
      return null;
  }
}

function inferStorageProvider(
  env: Record<string, string | undefined>,
  runtimeClass: RuntimeClass,
): PlatformStorageProviderId | null {
  if (runtimeClass === "persistent") return "local";
  if (env.BLOB_READ_WRITE_TOKEN) return "vercel_blob";
  if (env.AWS_ACCESS_KEY_ID) return "s3";
  if (env.R2_ACCOUNT_ID) return "r2";
  return null;
}

function isProviderConfigured(
  provider: PlatformStorageProviderId,
  env: Record<string, string | undefined>,
  localFsAvailable: boolean,
): boolean {
  switch (provider) {
    case "local":
      return localFsAvailable;
    case "vercel_blob":
      return !!env.BLOB_READ_WRITE_TOKEN;
    case "s3":
      return !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET);
    case "r2":
      return !!(
        env.R2_ACCOUNT_ID &&
        env.R2_ACCESS_KEY_ID &&
        env.R2_SECRET_ACCESS_KEY &&
        env.R2_BUCKET
      );
  }
}

export function detectRuntime(
  env: Record<string, string | undefined>,
): RuntimeCapabilities {
  const { environment, overridden, overrideRejected } = detectEnvironment(env);
  const runtimeClass: RuntimeClass = SERVERLESS_ENVIRONMENTS.has(environment)
    ? "serverless"
    : "persistent";
  const localFilesystemAvailable = runtimeClass === "persistent";
  const longRunningSupported = runtimeClass === "persistent";

  const taskQueueAvailable = !!env.RENDER_WORKFLOW_SLUG && !!env.RENDER_API_KEY;

  const explicitProvider = mapBlobStorageProvider(env.BLOB_STORAGE_PROVIDER);
  const platformStorageProvider =
    explicitProvider ?? inferStorageProvider(env, runtimeClass);

  const configuredPlatformStorageProvider =
    platformStorageProvider !== null &&
    isProviderConfigured(platformStorageProvider, env, localFilesystemAvailable)
      ? platformStorageProvider
      : null;

  return {
    environment,
    runtimeClass,
    localFilesystemAvailable,
    longRunningSupported,
    overridden,
    overrideRejected,
    taskQueueAvailable,
    platformStorageProvider,
    configuredPlatformStorageProvider,
  };
}
