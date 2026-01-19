import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import config from './mikro-orm.config';
import { createAppRouter } from './trpc';

const app = express();
const PORT = process.env.PORT || 3001;

async function bootstrap() {
  const orm = await MikroORM.init(config);
  await orm.getSchemaGenerator().ensureDatabase();
  await orm.getSchemaGenerator().updateSchema();

  app.use(express.static('dist'));

  // Add MikroORM request context middleware
  app.use((req, res, next) => {
    RequestContext.create(orm.em, next);
  });

  app.use(
    '/api/trpc',
    trpcExpress.createExpressMiddleware({
      router: createAppRouter(),
      createContext: () => ({ orm }),
    })
  );

  app.listen(PORT, () => {
    console.log(`tRPC server running on port ${PORT}`);
  });
}

bootstrap().catch(console.error);