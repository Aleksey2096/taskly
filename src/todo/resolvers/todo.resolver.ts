import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CreateTodoInput } from '../dto/create-todo.input';
import { UpdateTodoInput } from '../dto/update-todo.input';
import { TodoType } from '../graphql/todo.type';
import { TodoDocument } from '../schemas/todo.schema';
import { TodoService } from '../todo.service';
import { BadRequestException } from '@nestjs/common';

@Resolver(() => TodoType)
export class TodoResolver {
  constructor(private readonly todoService: TodoService) {}

  @Query(() => [TodoType])
  todos(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<TodoDocument[]> {
    const ownerId = new Types.ObjectId(currentUser.id);

    return this.todoService.findAllByOwner(ownerId);
  }

  @Query(() => TodoType)
  todo(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<TodoDocument> {
    this.validateTodoId(id);

    const ownerId = new Types.ObjectId(currentUser.id);

    return this.todoService.findOne(id, ownerId);
  }

  @Mutation(() => TodoType)
  createTodo(
    @Args('input') input: CreateTodoInput,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<TodoDocument> {
    const ownerId = new Types.ObjectId(currentUser.id);

    return this.todoService.create(input, ownerId);
  }

  @Mutation(() => TodoType)
  updateTodo(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateTodoInput,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<TodoDocument> {
    this.validateTodoId(id);

    const ownerId = new Types.ObjectId(currentUser.id);

    return this.todoService.update(id, input, ownerId);
  }

  @Mutation(() => Boolean)
  async deleteTodo(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<boolean> {
    this.validateTodoId(id);

    const ownerId = new Types.ObjectId(currentUser.id);

    await this.todoService.remove(id, ownerId);

    return true;
  }

  private validateTodoId(id: string): void {
    if (!/^[a-f\d]{24}$/i.test(id)) {
      throw new BadRequestException('Invalid todo ID');
    }
  }
}
