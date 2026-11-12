import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { Model } from 'mongoose';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';
import { UserService } from './user.service';

type Query<T> = {
  exec: () => Promise<T>;
};

type FindOneQuery = Query<UserDocument | null> & {
  select: (projection: string) => Query<UserDocument | null>;
};

describe('UserService', () => {
  let userService: UserService;

  const findByIdExec = jest.fn<() => Promise<UserDocument | null>>();
  const findOneExec = jest.fn<() => Promise<UserDocument | null>>();
  const findByIdAndUpdateExec = jest.fn<() => Promise<UserDocument | null>>();
  const deleteOneExec = jest.fn<() => Promise<{ deletedCount: number }>>();
  const findByEmailForAuthenticationExec =
    jest.fn<() => Promise<UserDocument | null>>();

  const findById = jest.fn<(id: string) => Query<UserDocument | null>>();

  const findOne = jest.fn<(filter: { email: string }) => FindOneQuery>();

  const select = jest.fn<(projection: string) => Query<UserDocument | null>>();

  const findByIdAndUpdate =
    jest.fn<
      (
        id: string,
        update: UpdateUserDto,
        options: { new: true; runValidators: true },
      ) => Query<UserDocument | null>
    >();

  const deleteOne =
    jest.fn<(filter: { _id: string }) => Query<{ deletedCount: number }>>();

  const create =
    jest.fn<
      (data: {
        email: string;
        passwordHash: string;
        displayName: string;
      }) => Promise<UserDocument>
    >();

  const userModel = {
    findById,
    findOne,
    findByIdAndUpdate,
    deleteOne,
    create,
  };

  const userId = '507f1f77bcf86cd799439011';

  const user = {
    _id: userId,
    id: userId,
    email: 'test@example.com',
    displayName: 'Test User',
    passwordHash: 'test-password-hash',
  } as unknown as UserDocument;

  beforeEach(() => {
    jest.clearAllMocks();

    findById.mockReturnValue({
      exec: findByIdExec,
    });

    findOne.mockReturnValue({
      exec: findOneExec,
      select,
    });

    select.mockReturnValue({
      exec: findByEmailForAuthenticationExec,
    });

    findByIdAndUpdate.mockReturnValue({
      exec: findByIdAndUpdateExec,
    });

    deleteOne.mockReturnValue({
      exec: deleteOneExec,
    });

    userService = new UserService(userModel as unknown as Model<User>);
  });

  describe('findById', () => {
    it('findById_whenUserExists_shouldReturnUser', async () => {
      findByIdExec.mockResolvedValue(user);

      await expect(userService.findById(userId)).resolves.toBe(user);

      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(userId);
      expect(findByIdExec).toHaveBeenCalledTimes(1);
    });

    it('findById_whenUserDoesNotExist_shouldThrowNotFoundException', async () => {
      findByIdExec.mockResolvedValue(null);

      await expect(userService.findById(userId)).rejects.toThrow(
        NotFoundException,
      );

      expect(findById).toHaveBeenCalledWith(userId);
    });

    it('findById_whenDatabaseFails_shouldPropagateError', async () => {
      const error = new Error('Database connection failed');

      findByIdExec.mockRejectedValue(error);

      await expect(userService.findById(userId)).rejects.toBe(error);
    });
  });

  describe('findByEmail', () => {
    it('findByEmail_whenUserExists_shouldReturnUser', async () => {
      const email = 'test@example.com';

      findOneExec.mockResolvedValue(user);

      await expect(userService.findByEmail(email)).resolves.toBe(user);

      expect(findOne).toHaveBeenCalledTimes(1);
      expect(findOne).toHaveBeenCalledWith({ email });
      expect(findOneExec).toHaveBeenCalledTimes(1);
    });

    it('findByEmail_whenUserDoesNotExist_shouldReturnNull', async () => {
      const email = 'unknown@example.com';

      findOneExec.mockResolvedValue(null);

      await expect(userService.findByEmail(email)).resolves.toBeNull();

      expect(findOne).toHaveBeenCalledWith({ email });
    });
  });

  describe('update', () => {
    it('update_whenUserExists_shouldUpdateUser', async () => {
      const input = {
        displayName: 'Updated User',
      } as UpdateUserDto;

      findByIdAndUpdateExec.mockResolvedValue(user);

      await expect(userService.update(userId, input)).resolves.toBe(user);

      expect(findByIdAndUpdate).toHaveBeenCalledTimes(1);
      expect(findByIdAndUpdate).toHaveBeenCalledWith(userId, input, {
        returnDocument: 'after',
        runValidators: true,
      });

      expect(findByIdAndUpdateExec).toHaveBeenCalledTimes(1);
    });

    it('update_whenUserDoesNotExist_shouldThrowNotFoundException', async () => {
      const input = {
        displayName: 'Updated User',
      } as UpdateUserDto;

      findByIdAndUpdateExec.mockResolvedValue(null);

      await expect(userService.update(userId, input)).rejects.toThrow(
        NotFoundException,
      );

      expect(findByIdAndUpdate).toHaveBeenCalledWith(userId, input, {
        returnDocument: 'after',
        runValidators: true,
      });
    });
  });

  describe('remove', () => {
    it('remove_whenUserExists_shouldDeleteUser', async () => {
      deleteOneExec.mockResolvedValue({
        deletedCount: 1,
      });

      await expect(userService.remove(userId)).resolves.toBeUndefined();

      expect(deleteOne).toHaveBeenCalledTimes(1);
      expect(deleteOne).toHaveBeenCalledWith({
        _id: userId,
      });

      expect(deleteOneExec).toHaveBeenCalledTimes(1);
    });

    it('remove_whenUserDoesNotExist_shouldThrowNotFoundException', async () => {
      deleteOneExec.mockResolvedValue({
        deletedCount: 0,
      });

      await expect(userService.remove(userId)).rejects.toThrow(
        NotFoundException,
      );

      expect(deleteOne).toHaveBeenCalledWith({
        _id: userId,
      });
    });
  });

  describe('create', () => {
    it('create_whenInputIsValid_shouldCreateAndReturnUser', async () => {
      const input = {
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        displayName: 'Test User',
      };

      create.mockResolvedValue(user);

      await expect(userService.create(input)).resolves.toBe(user);

      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith(input);
    });

    it('create_whenDatabaseFails_shouldPropagateError', async () => {
      const input = {
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        displayName: 'Test User',
      };

      const error = new Error('Database connection failed');

      create.mockRejectedValue(error);

      await expect(userService.create(input)).rejects.toBe(error);
    });
  });

  describe('findByEmailForAuthentication', () => {
    it('findByEmailForAuthentication_whenUserExists_shouldReturnUserWithPasswordHash', async () => {
      const email = 'test@example.com';

      findByEmailForAuthenticationExec.mockResolvedValue(user);

      await expect(
        userService.findByEmailForAuthentication(email),
      ).resolves.toBe(user);

      expect(findOne).toHaveBeenCalledWith({ email });
      expect(select).toHaveBeenCalledTimes(1);
      expect(select).toHaveBeenCalledWith('+passwordHash');

      expect(findByEmailForAuthenticationExec).toHaveBeenCalledTimes(1);
    });

    it('findByEmailForAuthentication_whenUserDoesNotExist_shouldReturnNull', async () => {
      const email = 'unknown@example.com';

      findByEmailForAuthenticationExec.mockResolvedValue(null);

      await expect(
        userService.findByEmailForAuthentication(email),
      ).resolves.toBeNull();

      expect(findOne).toHaveBeenCalledWith({ email });
      expect(select).toHaveBeenCalledWith('+passwordHash');
    });
  });
});
