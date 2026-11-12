import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import type { TodoDocument } from '../schemas/todo.schema';
import { TodoService } from '../todo.service';
import { TodoResolver } from './todo.resolver';

describe('TodoResolver', () => {
  let resolver: TodoResolver;

  const ownerId = new Types.ObjectId('507f1f77bcf86cd799439011');
  const todoId = '507f1f77bcf86cd799439012';

  const currentUser: AuthenticatedUser = {
    id: ownerId.toString(),
    email: 'test@example.com',
  };

  const findAllByOwner = jest.fn<TodoService['findAllByOwner']>();
  const findOne = jest.fn<TodoService['findOne']>();
  const create = jest.fn<TodoService['create']>();
  const update = jest.fn<TodoService['update']>();
  const remove = jest.fn<TodoService['remove']>();

  const todoService = {
    findAllByOwner,
    findOne,
    create,
    update,
    remove,
  };

  const todo = {
    _id: new Types.ObjectId(todoId),
    title: 'Test Todo',
    description: 'Test description',
    completed: false,
    owner: ownerId,
  } as unknown as TodoDocument;

  beforeEach(() => {
    jest.clearAllMocks();

    resolver = new TodoResolver(todoService as unknown as TodoService);
  });

  describe('todos', () => {
    it('todos_whenTodosExist_shouldReturnTodosBelongingToCurrentUser', async () => {
      const todos = [todo];

      findAllByOwner.mockResolvedValue(todos);

      await expect(resolver.todos(currentUser)).resolves.toEqual(todos);

      expect(findAllByOwner).toHaveBeenCalledTimes(1);

      const actualOwnerId = findAllByOwner.mock.calls[0][0];

      expect(actualOwnerId).toBeInstanceOf(Types.ObjectId);
      expect(actualOwnerId.equals(ownerId)).toBe(true);
    });
  });

  describe('todo', () => {
    it('todo_whenTodoExists_shouldReturnTodoBelongingToCurrentUser', async () => {
      findOne.mockResolvedValue(todo);

      await expect(resolver.todo(todoId, currentUser)).resolves.toEqual(todo);

      expect(findOne).toHaveBeenCalledTimes(1);
      expect(findOne).toHaveBeenCalledWith(todoId, expect.any(Types.ObjectId));

      const actualOwnerId = findOne.mock.calls[0][1];

      expect(actualOwnerId.equals(ownerId)).toBe(true);
    });

    it('todo_whenTodoIdIsInvalid_shouldThrowBadRequestException', () => {
      expect(() => resolver.todo('invalid-id', currentUser)).toThrow(
        BadRequestException,
      );

      expect(findOne).not.toHaveBeenCalled();
    });
  });

  describe('createTodo', () => {
    it('createTodo_whenInputIsValid_shouldCreateTodoForCurrentUser', async () => {
      const input = {
        title: 'New Todo',
        description: 'New description',
      } as Parameters<TodoResolver['createTodo']>[0];

      create.mockResolvedValue(todo);

      await expect(resolver.createTodo(input, currentUser)).resolves.toEqual(
        todo,
      );

      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith(input, expect.any(Types.ObjectId));

      const actualOwnerId = create.mock.calls[0][1];

      expect(actualOwnerId.equals(ownerId)).toBe(true);
    });
  });

  describe('updateTodo', () => {
    it('updateTodo_whenInputIsValid_shouldUpdateTodoBelongingToCurrentUser', async () => {
      const input = {
        title: 'Updated Todo',
        completed: true,
      } as Parameters<TodoResolver['updateTodo']>[1];

      update.mockResolvedValue(todo);

      await expect(
        resolver.updateTodo(todoId, input, currentUser),
      ).resolves.toEqual(todo);

      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith(
        todoId,
        input,
        expect.any(Types.ObjectId),
      );

      const actualOwnerId = update.mock.calls[0][2];

      expect(actualOwnerId.equals(ownerId)).toBe(true);
    });

    it('updateTodo_whenTodoIdIsInvalid_shouldThrowBadRequestException', () => {
      const input = {
        title: 'Updated Todo',
      } as Parameters<TodoResolver['updateTodo']>[1];

      expect(() =>
        resolver.updateTodo('invalid-id', input, currentUser),
      ).toThrow(BadRequestException);

      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('deleteTodo', () => {
    it('deleteTodo_whenTodoIdIsValid_shouldDeleteTodoAndReturnTrue', async () => {
      // The mocked remove method returns undefined by default.
      // This is sufficient because the resolver only awaits its result.
      await expect(resolver.deleteTodo(todoId, currentUser)).resolves.toBe(
        true,
      );

      expect(remove).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledWith(todoId, expect.any(Types.ObjectId));

      const actualOwnerId = remove.mock.calls[0][1];

      expect(actualOwnerId.equals(ownerId)).toBe(true);
    });

    it('deleteTodo_whenTodoIdIsInvalid_shouldRejectWithBadRequestException', async () => {
      await expect(
        resolver.deleteTodo('invalid-id', currentUser),
      ).rejects.toThrow(BadRequestException);

      expect(remove).not.toHaveBeenCalled();
    });
  });
});
