import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { UserService } from '../user.service';
import { UserResolver } from './user.resolver';

describe('UserResolver', () => {
  let resolver: UserResolver;

  const findById =
    jest.fn<
      (
        ...args: Parameters<UserService['findById']>
      ) => Promise<Awaited<ReturnType<UserService['findById']>> | null>
    >();

  const update =
    jest.fn<
      (
        ...args: Parameters<UserService['update']>
      ) => Promise<Awaited<ReturnType<UserService['update']>> | null>
    >();

  const userService = {
    findById,
    update,
  };

  const userId = '507f1f77bcf86cd799439011';

  const currentUser: AuthenticatedUser = {
    id: userId,
    email: 'test@example.com',
  };

  const user = {
    _id: userId,
    email: 'test@example.com',
    displayName: 'Test User',
  } as unknown as NonNullable<Awaited<ReturnType<UserService['findById']>>>;

  beforeEach(() => {
    jest.clearAllMocks();

    resolver = new UserResolver(userService as unknown as UserService);
  });

  describe('me', () => {
    it('me_whenUserExists_shouldReturnCurrentUser', async () => {
      findById.mockResolvedValue(user);

      await expect(resolver.me(currentUser)).resolves.toEqual(user);

      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(userId);
    });

    it('me_whenUserDoesNotExist_shouldThrowNotFoundException', async () => {
      findById.mockResolvedValue(null);

      await expect(resolver.me(currentUser)).rejects.toThrow(NotFoundException);

      expect(findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateMe', () => {
    it('updateMe_whenUserExists_shouldUpdateCurrentUser', async () => {
      const input = {
        displayName: 'Updated User',
      } as Parameters<UserResolver['updateMe']>[1];

      const updatedUser = {
        ...user,
        displayName: 'Updated User',
      } as NonNullable<Awaited<ReturnType<UserService['update']>>>;

      update.mockResolvedValue(updatedUser);

      await expect(resolver.updateMe(currentUser, input)).resolves.toEqual(
        updatedUser,
      );

      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith(userId, input);
    });

    it('updateMe_whenUserDoesNotExist_shouldThrowNotFoundException', async () => {
      const input = {
        displayName: 'Updated User',
      } as Parameters<UserResolver['updateMe']>[1];

      update.mockResolvedValue(null);

      await expect(resolver.updateMe(currentUser, input)).rejects.toThrow(
        NotFoundException,
      );

      expect(update).toHaveBeenCalledWith(userId, input);
    });
  });
});
