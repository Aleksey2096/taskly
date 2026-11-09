import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Types, type Model } from 'mongoose';
import type { CreateTodoDto } from './dto/create-todo.dto';
import type { UpdateTodoDto } from './dto/update-todo.dto';
import type { Todo, TodoDocument } from './schemas/todo.schema';
import { TodoService } from './todo.service';

type Query<T> = {
  exec: () => Promise<T>;
};

type SortedQuery<T> = {
  sort: (options: { createdAt: -1 }) => Query<T>;
};

type TodoFilter = {
  _id: string;
  owner: Types.ObjectId;
};

type OwnerFilter = {
  owner: Types.ObjectId;
};

type UpdateOptions = {
  new: true;
  runValidators: true;
};

describe('TodoService', () => {
  let todoService: TodoService;

  const create =
    jest.fn<
      (data: CreateTodoDto & { owner: Types.ObjectId }) => Promise<TodoDocument>
    >();

  const findExec = jest.fn<() => Promise<TodoDocument[]>>();

  const sort = jest.fn<(options: { createdAt: -1 }) => Query<TodoDocument[]>>();

  const find = jest.fn<(filter: OwnerFilter) => SortedQuery<TodoDocument[]>>();

  const findOneExec = jest.fn<() => Promise<TodoDocument | null>>();

  const findOne = jest.fn<(filter: TodoFilter) => Query<TodoDocument | null>>();

  const findOneAndUpdateExec = jest.fn<() => Promise<TodoDocument | null>>();

  const findOneAndUpdate =
    jest.fn<
      (
        filter: TodoFilter,
        update: UpdateTodoDto,
        options: UpdateOptions,
      ) => Query<TodoDocument | null>
    >();

  const deleteOneExec = jest.fn<() => Promise<{ deletedCount: number }>>();

  const deleteOne =
    jest.fn<(filter: TodoFilter) => Query<{ deletedCount: number }>>();

  const todoModel = {
    create,
    find,
    findOne,
    findOneAndUpdate,
    deleteOne,
  };

  const ownerId = new Types.ObjectId('507f1f77bcf86cd799439011');

  const todoId = '507f1f77bcf86cd799439012';

  const todo = {
    _id: new Types.ObjectId(todoId),
    title: 'Test Todo',
    description: 'Test description',
    completed: false,
    owner: ownerId,
  } as unknown as TodoDocument;

  beforeEach(() => {
    jest.clearAllMocks();

    find.mockReturnValue({
      sort,
    });

    sort.mockReturnValue({
      exec: findExec,
    });

    findOne.mockReturnValue({
      exec: findOneExec,
    });

    findOneAndUpdate.mockReturnValue({
      exec: findOneAndUpdateExec,
    });

    deleteOne.mockReturnValue({
      exec: deleteOneExec,
    });

    todoService = new TodoService(todoModel as unknown as Model<Todo>);
  });

  describe('create', () => {
    it('create_whenInputIsValid_shouldCreateTodoForOwner', async () => {
      const input = {
        title: 'New Todo',
        description: 'New description',
      } as CreateTodoDto;

      create.mockResolvedValue(todo);

      await expect(todoService.create(input, ownerId)).resolves.toBe(todo);

      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith({
        ...input,
        owner: ownerId,
      });
    });

    it('create_whenDatabaseFails_shouldPropagateError', async () => {
      const input = {
        title: 'New Todo',
        description: 'New description',
      } as CreateTodoDto;

      const error = new Error('Database connection failed');

      create.mockRejectedValue(error);

      await expect(todoService.create(input, ownerId)).rejects.toBe(error);
    });
  });

  describe('findAllByOwner', () => {
    it('findAllByOwner_whenTodosExist_shouldReturnOwnerTodosSortedByCreationDate', async () => {
      const todos = [todo];

      findExec.mockResolvedValue(todos);

      await expect(todoService.findAllByOwner(ownerId)).resolves.toEqual(todos);

      expect(find).toHaveBeenCalledTimes(1);
      expect(find).toHaveBeenCalledWith({
        owner: ownerId,
      });

      expect(sort).toHaveBeenCalledTimes(1);
      expect(sort).toHaveBeenCalledWith({
        createdAt: -1,
      });

      expect(findExec).toHaveBeenCalledTimes(1);
    });

    it('findAllByOwner_whenOwnerHasNoTodos_shouldReturnEmptyArray', async () => {
      findExec.mockResolvedValue([]);

      await expect(todoService.findAllByOwner(ownerId)).resolves.toEqual([]);

      expect(find).toHaveBeenCalledWith({
        owner: ownerId,
      });

      expect(sort).toHaveBeenCalledWith({
        createdAt: -1,
      });
    });

    it('findAllByOwner_whenDatabaseFails_shouldPropagateError', async () => {
      const error = new Error('Database connection failed');

      findExec.mockRejectedValue(error);

      await expect(todoService.findAllByOwner(ownerId)).rejects.toBe(error);
    });
  });

  describe('findOne', () => {
    it('findOne_whenTodoBelongsToOwner_shouldReturnTodo', async () => {
      findOneExec.mockResolvedValue(todo);

      await expect(todoService.findOne(todoId, ownerId)).resolves.toBe(todo);

      expect(findOne).toHaveBeenCalledTimes(1);
      expect(findOne).toHaveBeenCalledWith({
        _id: todoId,
        owner: ownerId,
      });

      expect(findOneExec).toHaveBeenCalledTimes(1);
    });

    it('findOne_whenTodoDoesNotBelongToOwner_shouldThrowNotFoundException', async () => {
      findOneExec.mockResolvedValue(null);

      await expect(todoService.findOne(todoId, ownerId)).rejects.toThrow(
        NotFoundException,
      );

      expect(findOne).toHaveBeenCalledWith({
        _id: todoId,
        owner: ownerId,
      });
    });

    it('findOne_whenDatabaseFails_shouldPropagateError', async () => {
      const error = new Error('Database connection failed');

      findOneExec.mockRejectedValue(error);

      await expect(todoService.findOne(todoId, ownerId)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('update_whenTodoBelongsToOwner_shouldUpdateTodo', async () => {
      const input = {
        title: 'Updated Todo',
        completed: true,
      } as UpdateTodoDto;

      findOneAndUpdateExec.mockResolvedValue(todo);

      await expect(todoService.update(todoId, input, ownerId)).resolves.toBe(
        todo,
      );

      expect(findOneAndUpdate).toHaveBeenCalledTimes(1);

      expect(findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: todoId,
          owner: ownerId,
        },
        input,
        {
          returnDocument: 'after',
          runValidators: true,
        },
      );

      expect(findOneAndUpdateExec).toHaveBeenCalledTimes(1);
    });

    it('update_whenTodoDoesNotBelongToOwner_shouldThrowNotFoundException', async () => {
      const input = {
        title: 'Updated Todo',
      } as UpdateTodoDto;

      findOneAndUpdateExec.mockResolvedValue(null);

      await expect(todoService.update(todoId, input, ownerId)).rejects.toThrow(
        NotFoundException,
      );

      expect(findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: todoId,
          owner: ownerId,
        },
        input,
        {
          returnDocument: 'after',
          runValidators: true,
        },
      );
    });

    it('update_whenDatabaseFails_shouldPropagateError', async () => {
      const input = {
        title: 'Updated Todo',
      } as UpdateTodoDto;

      const error = new Error('Database connection failed');

      findOneAndUpdateExec.mockRejectedValue(error);

      await expect(todoService.update(todoId, input, ownerId)).rejects.toBe(
        error,
      );
    });
  });

  describe('remove', () => {
    it('remove_whenTodoBelongsToOwner_shouldDeleteTodo', async () => {
      deleteOneExec.mockResolvedValue({
        deletedCount: 1,
      });

      await expect(
        todoService.remove(todoId, ownerId),
      ).resolves.toBeUndefined();

      expect(deleteOne).toHaveBeenCalledTimes(1);
      expect(deleteOne).toHaveBeenCalledWith({
        _id: todoId,
        owner: ownerId,
      });

      expect(deleteOneExec).toHaveBeenCalledTimes(1);
    });

    it('remove_whenTodoDoesNotBelongToOwner_shouldThrowNotFoundException', async () => {
      deleteOneExec.mockResolvedValue({
        deletedCount: 0,
      });

      await expect(todoService.remove(todoId, ownerId)).rejects.toThrow(
        NotFoundException,
      );

      expect(deleteOne).toHaveBeenCalledWith({
        _id: todoId,
        owner: ownerId,
      });
    });

    it('remove_whenDatabaseFails_shouldPropagateError', async () => {
      const error = new Error('Database connection failed');

      deleteOneExec.mockRejectedValue(error);

      await expect(todoService.remove(todoId, ownerId)).rejects.toBe(error);
    });
  });
});
