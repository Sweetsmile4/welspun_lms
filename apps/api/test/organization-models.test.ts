import mongoose from 'mongoose';
import { afterAll, describe, expect, it } from 'vitest';
import { createOrganizationModels } from '../src/modules/identity/organization/models.js';
const connection = mongoose.createConnection();
const models = createOrganizationModels(connection);
const id = () => new mongoose.Types.ObjectId();
const meta = { createdBy: 'synthetic-test', updatedBy: 'synthetic-test' };
afterAll(async () => {
  await connection.close();
});
describe('disconnected Mongoose schema validation', () => {
  it('registers only four requested collections without opening a connection', () => {
    expect(connection.readyState).toBe(0);
    expect(
      Object.values(models)
        .map((model) => model.collection.name)
        .sort(),
    ).toEqual(['memberships', 'orgUnits', 'organizations', 'users']);
    for (const model of Object.values(models)) {
      expect(model.schema.get('autoIndex')).toBe(false);
      expect(model.schema.get('bufferCommands')).toBe(false);
    }
  });
  it('rejects unknown fields, invalid time zones, invalid ancestry and reversed dates', async () => {
    expect(
      () =>
        new models.users({ ...meta, password: 'synthetic-forbidden-field' }),
    ).toThrow();
    await expect(
      new models.organizations({
        ...meta,
        code: 'SYN',
        name: 'Synthetic',
        timeZone: 'Not/AZone',
      }).validate(),
    ).rejects.toThrow();
    await expect(
      new models.orgUnits({
        ...meta,
        organizationId: id(),
        type: 'department',
        code: 'SYN',
        name: 'Synthetic',
        parentId: null,
        ancestorIds: [],
      }).validate(),
    ).rejects.toThrow();
    await expect(
      new models.memberships({
        ...meta,
        organizationId: id(),
        userId: id(),
        orgUnitId: id(),
        validFrom: new Date('2026-01-02Z'),
        validTo: new Date('2026-01-01Z'),
      }).validate(),
    ).rejects.toThrow();
  });
  it('declares partial uniqueness for optional employee IDs rather than unique null values', () => {
    const index = models.users.schema
      .indexes()
      .find(([, options]) => options.name === 'optional_employee_id_unique');
    expect(index?.[1]).toMatchObject({
      unique: true,
      partialFilterExpression: { employeeId: { $type: 'string' } },
    });
  });
});
