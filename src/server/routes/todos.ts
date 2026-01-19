import { z } from 'zod';
import { initTRPC } from '@trpc/server';
import { Todo } from '../entities/Todo';
import type { Context } from '../trpc';

const t = initTRPC.context<Context>().create();
const router = t.router;
const publicProcedure = t.procedure;

export const todosRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.orm.em.find(Todo, {});
  }),

  create: publicProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const todo = new Todo({ 
        title: input.title, 
        description: input.description 
      });
      await ctx.orm.em.persistAndFlush(todo);
      return todo;
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      completed: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const todo = await ctx.orm.em.findOneOrFail(Todo, input.id);
      
      if (input.title !== undefined) todo.title = input.title;
      if (input.description !== undefined) todo.description = input.description;
      if (input.completed !== undefined) todo.completed = input.completed;
      
      await ctx.orm.em.flush();
      return todo;
    }),

  delete: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const todo = await ctx.orm.em.findOneOrFail(Todo, input.id);
      await ctx.orm.em.removeAndFlush(todo);
      return { success: true };
    }),

  get: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      return await ctx.orm.em.findOneOrFail(Todo, input.id);
    }),
});