import { initTRPC } from '@trpc/server';
import { MikroORM } from '@mikro-orm/core';

export interface Context {
  orm: MikroORM;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
