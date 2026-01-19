import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class Todo {
  @PrimaryKey()
  id?: number;

  @Property()
  title: string;

  @Property({ nullable: true })
  description?: string;

  @Property()
  completed: boolean;

  @Property()
  createdAt: Date;

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date;

  constructor(params: { title: string; description?: string }) {
    this.title = params.title;
    this.description = params.description;
    this.completed = false;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}