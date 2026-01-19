import { documentsRouter } from './routes/documents';
import { todosRouter } from './routes/todos';
import { router, publicProcedure } from './trpc-base';

export { router, publicProcedure, type Context } from './trpc-base';

export function createAppRouter() {
  return router({
    hello: publicProcedure.query(() => {
      return { message: 'Hello World!' };
    }),

    documents: documentsRouter,
    todos: todosRouter,
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;