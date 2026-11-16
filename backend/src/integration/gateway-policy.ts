import { z } from 'zod';
import { assertOpaqueSecret } from './session-crypto.js';
import { developmentSessionCookieName } from './session-cookie.js';

const safeForwardHeaders = new Set([
  'cookie',
  'content-type',
  'accept',
  'if-match',
  'idempotency-key',
  'x-csrf-token',
  'x-request-id',
]);
const forbiddenBrowserHeaders = new Set([
  'authorization',
  'x-user-id',
  'x-actor-id',
  'x-role',
  'x-roles',
  'x-organization-id',
]);
const forwardingHeader = /^x-forwarded-|^forwarded$|^x-real-ip$/;
const requestIdSchema = z.uuid();
const routeSchema = z.strictObject({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string().regex(/^\/integration\/api\/v1\/[a-z0-9/_-]+$/),
  queryKeys: z
    .array(z.enum(['detail', 'search', 'cursor', 'limit', 'scopeUnitId']))
    .max(5)
    .optional(),
});
export type GatewayRoute = z.infer<typeof routeSchema>;

export function createGatewayPolicy(input: {
  upstreamOrigin: string;
  routes: readonly GatewayRoute[];
}) {
  const upstream = new URL(input.upstreamOrigin);
  if (
    upstream.protocol !== 'https:' ||
    upstream.username ||
    upstream.password ||
    upstream.pathname !== '/' ||
    upstream.search ||
    upstream.hash ||
    input.upstreamOrigin !== upstream.origin
  )
    throw new Error('Gateway upstream must be a fixed HTTPS origin');
  const routes = input.routes.map((route) => {
    const parsed = routeSchema.parse(route);
    return Object.freeze({
      ...parsed,
      queryKeys: Object.freeze([...(parsed.queryKeys ?? [])]),
    });
  });
  if (!routes.length)
    throw new Error('Gateway route allowlist cannot be empty');
  return Object.freeze({
    upstreamOrigin: upstream.origin,
    routes: Object.freeze(routes),
    resolve(method: unknown, path: unknown) {
      if (typeof method !== 'string' || typeof path !== 'string')
        throw new Error('Gateway request is invalid');
      const normalizedMethod = method.toUpperCase();
      const target = new URL(path, upstream.origin);
      if (
        target.origin !== upstream.origin ||
        target.pathname !== path.split('?')[0] ||
        !path.startsWith('/') ||
        path.startsWith('//') ||
        path.includes('#') ||
        /[\r\n]/.test(path) ||
        path.includes('\\') ||
        target.pathname.includes('/../') ||
        target.pathname.includes('/./')
      )
        throw new Error('Gateway destination is not allowed');
      const route = routes.find(
        (candidate) =>
          candidate.method === normalizedMethod &&
          candidate.path === target.pathname,
      );
      if (!route) throw new Error('Gateway route is not allowed');
      for (const [key, value] of target.searchParams)
        if (
          !route.queryKeys.some((allowed) => allowed === key) ||
          target.searchParams.getAll(key).length !== 1 ||
          value.length > 200 ||
          /[\r\n]/.test(value)
        )
          throw new Error('Gateway query is not allowed');
      return `${upstream.origin}${target.pathname}${target.search}`;
    },
  });
}

export function prepareGatewayHeaders(raw: readonly [unknown, unknown][]) {
  if (!Array.isArray(raw) || raw.length > 64)
    throw new Error('Gateway header is invalid');
  const output: [string, string][] = [];
  const seen = new Set<string>();
  for (const [rawName, rawValue] of raw) {
    if (
      typeof rawName !== 'string' ||
      typeof rawValue !== 'string' ||
      !/^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,128}$/.test(rawName) ||
      rawValue.length > 8192 ||
      /[\r\n]/.test(rawValue)
    )
      throw new Error('Gateway header is invalid');
    const name = rawName.toLowerCase();
    if (
      forbiddenBrowserHeaders.has(name) ||
      /^x-(?:workload|auth|actor|user|roles?|permissions?|scope|organization)(?:-|$)/.test(
        name,
      )
    )
      throw new Error('Browser identity headers are not accepted');
    if (forwardingHeader.test(name)) continue;
    if (!safeForwardHeaders.has(name)) continue;
    if (seen.has(name))
      throw new Error('Duplicate gateway header is not accepted');
    if (name === 'x-request-id') requestIdSchema.parse(rawValue);
    seen.add(name);
    if (name === 'cookie') {
      const candidates = rawValue
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.startsWith(developmentSessionCookieName + '='));
      if (candidates.length > 1)
        throw new Error('Duplicate session cookie is not accepted');
      if (!candidates.length) continue;
      assertOpaqueSecret(
        candidates[0]!.slice(developmentSessionCookieName.length + 1),
      );
      output.push([name, candidates[0]!]);
      continue;
    }
    output.push([name, rawValue]);
  }
  return output;
}
