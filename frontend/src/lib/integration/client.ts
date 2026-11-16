import type {
  Unavailable,
  CommandMetadata,
} from '@welspun/contracts/integration/v1';

export interface IntegrationReadRequests {
  'session.read': Record<string, never>;
  'draft.read': { courseId: string };
  'catalog.list': { search?: string; cursor?: string; limit?: number };
}
export interface IntegrationClient {
  read<K extends keyof IntegrationReadRequests>(
    operation: K,
    input: IntegrationReadRequests[K],
  ): Promise<Unavailable>;
  command(metadata: CommandMetadata, payload: unknown): Promise<Unavailable>;
}
const unavailable: Unavailable = Object.freeze({
  available: false,
  code: 'INTEGRATION_UNAVAILABLE',
  message: 'Integration is unavailable.',
  retry: 'none',
});
/** No fetch, configuration, tokens, fixtures, storage or enabled implementation. */
export const integrationClient: Readonly<IntegrationClient> = Object.freeze({
  read: async () => unavailable,
  command: async () => unavailable,
});
