import { MikroORM } from '@mikro-orm/core';
import { createAppRouter } from '../trpc';

export function createTestCaller(orm: MikroORM) {
  const router = createAppRouter();
  
  return router.createCaller({
    orm,
  });
}

export type TestCaller = ReturnType<typeof createTestCaller>;