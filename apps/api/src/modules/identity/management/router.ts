import { Router, type Request } from 'express';
import { z } from 'zod';
import { success } from '@welspun/contracts';
import { HttpError } from '../../../platform/errors.js';
import type { HttpSecurity } from '../http-security.js';
import { protectedController } from '../http-security.js';
import * as c from './contracts.js';
import type { createManagementService, Operation } from './service.js';
import { assertManagementService } from './service.js';
import { assertHttpSecurity } from '../http-security.js';

const empty = z.strictObject({});
function precondition(request: Request, required: boolean) {
  const value = request.get('if-match');
  if (!value) {
    if (required)
      throw new HttpError(
        428,
        'PRECONDITION_REQUIRED',
        'A revision precondition is required',
      );
    return undefined;
  }
  if (
    !required ||
    !/^"(0|[1-9]\d*)"$/.test(value) ||
    !Number.isSafeInteger(Number(value.slice(1, -1)))
  )
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      'Invalid revision precondition',
    );
  return Number(value.slice(1, -1));
}
/** Reusable controllers, test-mountable ONLY. No normal-server registration or production switch. */
export function createManagementRouter(
  security: HttpSecurity,
  service: ReturnType<typeof createManagementService>,
  options: { isolatedTest: true },
) {
  function guard() {
    assertHttpSecurity(security);
    assertManagementService(service);
    if (
      process.env.NODE_ENV !== 'test' ||
      options.isolatedTest !== true ||
      security.provider.mode !== 'synthetic-test'
    )
      throw new Error('Management router requires isolated tests');
  }
  guard();
  const router = Router();
  router.use((_req, _res, next) => {
    try {
      guard();
      next();
    } catch {
      next(
        new HttpError(
          503,
          'MANAGEMENT_DISABLED',
          'Management operations are unavailable',
        ),
      );
    }
  });
  router.use(security.authenticate);
  const root = '/organizations/:organizationId';
  const input = (
    params: z.ZodType,
    query: z.ZodType = empty,
    body: z.ZodType = empty,
  ) => z.strictObject({ params, query, body });
  const read = (request: Request) => ({
    params: request.params,
    query: request.query,
    body: request.body ?? {},
  });
  function list(
    path: string,
    entity: 'employee' | 'unit' | 'role' | 'grant',
    query: z.ZodType,
  ) {
    const schema = z.strictObject({
      params: c.organizationParams,
      query,
      body: empty,
    });
    router.get(
      root + path,
      protectedController(
        security,
        schema,
        read,
        (credential, value) =>
          service.list(
            credential,
            value.params.organizationId,
            entity,
            c.listQuery.parse(value.query),
          ),
        (value) => value,
        c.pageDto(c.dto[entity]),
        200,
        (value) => value.nextCursor,
      ),
    );
  }
  const paging = c.listQuery.pick({ limit: true, cursor: true });
  list(
    '/employees',
    'employee',
    paging.extend({ namePrefix: c.listQuery.shape.namePrefix }),
  );
  list(
    '/org-units',
    'unit',
    paging.extend({ namePrefix: c.listQuery.shape.namePrefix }),
  );
  list('/roles', 'role', paging.extend({ status: c.listQuery.shape.status }));
  list(
    '/role-grants',
    'grant',
    paging.extend({ userId: c.listQuery.shape.userId }),
  );
  const detail = z.strictObject({
    params: c.resourceParams,
    query: empty,
    body: empty,
  });
  router.get(
    root + '/employees/:resourceId',
    protectedController(
      security,
      detail,
      read,
      (credential, value) =>
        service.employee(
          credential,
          value.params.organizationId,
          value.params.resourceId,
        ),
      (value) => value,
      c.dto.employee,
    ),
  );
  for (const current of [false, true])
    router.get(
      root +
        `/employees/:resourceId/${current ? 'current-memberships' : 'memberships'}`,
      protectedController(
        security,
        detail,
        read,
        (credential, value) =>
          service.history(
            credential,
            value.params.organizationId,
            value.params.resourceId,
            current,
          ),
        (value) => value,
        z.array(c.dto.membership),
      ),
    );
  router.post(
    root + '/org-units/:resourceId/move-preview',
    protectedController(
      security,
      z.strictObject({
        params: c.resourceParams,
        query: empty,
        body: c.moveBody,
        revision: c.revision,
      }),
      (request) => ({
        ...read(request),
        revision: precondition(request, true),
      }),
      (credential, value) =>
        service.preview(
          credential,
          value.params.organizationId,
          value.params.resourceId,
          value.body.parentId,
          value.revision,
        ),
      (value) => value,
      c.movePreviewDto,
    ),
  );
  function command(
    path: string,
    operation: Operation,
    body: z.ZodType,
    resource: boolean,
    requiresRevision: boolean,
    output: z.ZodType,
  ) {
    router.post(
      root + path,
      security.isolatedMutation,
      async (request, response, next) => {
        try {
          const credential = security.credential(request);
          const validated = input(
            resource ? c.resourceParams : c.organizationParams,
            empty,
            body,
          ).parse(read(request));
          const params = validated.params as z.infer<typeof c.resourceParams>;
          const suppliedKey = request.get('idempotency-key');
          if (!suppliedKey)
            throw new HttpError(
              428,
              'IDEMPOTENCY_REQUIRED',
              'A command idempotency key is required',
            );
          const key = z.uuid().parse(suppliedKey).toLowerCase();
          const revision = precondition(request, requiresRevision);
          const result = await service.command(credential, {
            operation,
            organizationId: params.organizationId,
            resourceId: params.resourceId,
            body: validated.body as Record<string, unknown>,
            precondition: revision,
            key,
          });
          let dto: unknown;
          try {
            dto = output.parse(result.data);
          } catch {
            throw new HttpError(
              500,
              'INTERNAL_ERROR',
              'An unexpected error occurred',
            );
          }
          response.setHeader('idempotency-replayed', String(result.replayed));
          response
            .status(
              ['unit.move', 'membership.close', 'grant.revoke'].includes(
                operation,
              )
                ? 200
                : 201,
            )
            .json(success(dto, response.locals.requestId));
        } catch (error) {
          if (
            error instanceof Error &&
            'code' in error &&
            error.code === 'FORBIDDEN'
          )
            await security.denial(response.locals.requestId);
          next(error);
        }
      },
    );
  }
  command(
    '/employees',
    'employee.provision',
    c.provisionBody,
    false,
    false,
    c.dto.employee,
  );
  command('/org-units', 'unit.create', c.unitBody, false, true, c.dto.unit);
  command(
    '/org-units/:resourceId/moves',
    'unit.move',
    c.moveBody,
    true,
    true,
    c.dto.unit,
  );
  command(
    '/memberships',
    'membership.create',
    c.membershipBody,
    false,
    false,
    c.dto.membership,
  );
  command(
    '/memberships/:resourceId/close',
    'membership.close',
    c.closeBody,
    true,
    true,
    c.dto.membership,
  );
  command(
    '/memberships/:resourceId/transfers',
    'membership.transfer',
    c.transferBody,
    true,
    true,
    c.transferDto,
  );
  command('/roles', 'role.define', c.roleBody, false, true, c.dto.role);
  command(
    '/role-grants',
    'grant.create',
    c.grantBody,
    false,
    false,
    c.dto.grant,
  );
  command(
    '/role-grants/:resourceId/revoke',
    'grant.revoke',
    c.revokeBody,
    true,
    true,
    c.dto.grant,
  );
  return router;
}
