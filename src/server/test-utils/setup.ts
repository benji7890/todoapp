import { MikroORM } from '@mikro-orm/core';
import config from '../mikro-orm.config';

let orm: MikroORM;

export async function setupTestDb(): Promise<MikroORM> {
  orm = await MikroORM.init({
    ...config,
    dbName: ':memory:',
    allowGlobalContext: true,
  });

  const generator = orm.getSchemaGenerator();
  await generator.createSchema();

  return orm;
}

export async function clearTestDb(): Promise<void> {
  if (orm) {
    const generator = orm.getSchemaGenerator();
    await generator.clearDatabase();
  }
}

export async function closeTestDb(): Promise<void> {
  if (orm) {
    await orm.close();
  }
}