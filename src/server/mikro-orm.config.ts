import { defineConfig } from '@mikro-orm/sqlite';
import { Document } from './entities/Document';
import { Todo } from './entities/Todo';

export default defineConfig({
  entities: [Document, Todo],
  dbName: 'database.sqlite3',
  debug: true,
});