import { z } from 'zod';

export class IntegrationConfigurationError extends Error {
  readonly code = 'INTEGRATION_CONFIGURATION_DENIED';
  constructor() {
    super('Integration configuration is not permitted.');
  }
}
export const disabledConfiguration = Object.freeze({
  enabled: false as const,
  reason: 'OFFLINE_FOUNDATION' as const,
});

/** Syntax validation only: never a target approval or permission to connect. */
export function parseLoopbackOrigin(input: unknown): string {
  try {
    const value = z.string().max(256).parse(input);
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !['127.0.0.1', '[::1]'].includes(url.hostname) ||
      !url.port ||
      url.username ||
      url.password ||
      value !== url.origin
    )
      throw new Error();
    return value;
  } catch {
    throw new IntegrationConfigurationError();
  }
}
const planSchema = z.strictObject({
  browserOrigin: z.string(),
  upstreamOrigin: z.string(),
});
export function inspectTransportPlan(input: unknown) {
  try {
    const plan = planSchema.parse(input);
    const browserOrigin = parseLoopbackOrigin(plan.browserOrigin);
    const upstreamOrigin = parseLoopbackOrigin(plan.upstreamOrigin);
    if (browserOrigin === upstreamOrigin) throw new Error();
    return Object.freeze({
      enabled: false as const,
      browserOrigin,
      upstreamOrigin,
    });
  } catch {
    throw new IntegrationConfigurationError();
  }
}
const configurationSchema = z.strictObject({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  APP_ENV: z.literal('development-integration').optional(),
  LMS_INTEGRATION_ENABLED: z.enum(['true', 'false']).optional(),
  browserOrigin: z.string().optional(),
  upstreamOrigin: z.string().optional(),
  // Approved development database name; no alias or implicit default.
  DATABASE_NAME: z.literal('welspun_lms_dev').optional(),
  // Backend-only opaque candidate. Empty supports credential-free examples.
  // This preliminary syntax check is NOT cluster/TLS/credential validation.
  MONGOURI: z
    .union([
      z.literal(''),
      z
        .string()
        .max(4096)
        .regex(/^mongodb\+srv:\/\/\S+$/),
    ])
    .optional(),
});
/** Accept a dedicated explicit config object, never process.env wholesale. No enabled result exists. */
export function parseIntegrationConfiguration(input: unknown = {}) {
  try {
    const config = configurationSchema.parse(input);
    if (config.MONGOURI !== undefined && config.DATABASE_NAME === undefined)
      throw new Error();
    if (
      config.browserOrigin !== undefined ||
      config.upstreamOrigin !== undefined
    )
      inspectTransportPlan({
        browserOrigin: config.browserOrigin,
        upstreamOrigin: config.upstreamOrigin,
      });
    if (config.LMS_INTEGRATION_ENABLED === 'true') {
      if (
        config.NODE_ENV !== 'development' ||
        config.APP_ENV !== 'development-integration' ||
        !config.browserOrigin ||
        !config.upstreamOrigin
      )
        throw new Error();
      // Database choice is approved; provider, adapter and runtime composition remain unavailable.
      throw new Error();
    }
    return disabledConfiguration;
  } catch {
    throw new IntegrationConfigurationError();
  }
}
