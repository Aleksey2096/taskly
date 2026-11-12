import { jest } from '@jest/globals';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const getAllAndOverride =
    jest.fn<
      (metadataKey: string, targets: Function[]) => boolean | undefined
    >();

  const reflector = {
    getAllAndOverride,
  } as unknown as Reflector;

  beforeEach(() => {
    jest.clearAllMocks();
    getAllAndOverride.mockReturnValue(undefined);

    guard = new JwtAuthGuard(reflector);
  });

  describe('canActivate', () => {
    it('canActivate_whenHandlerIsPublic_shouldAllowAccess', () => {
      getAllAndOverride.mockReturnValue(true);

      const handler = jest.fn();
      const controller = jest.fn();

      const context = {
        getHandler: () => handler,
        getClass: () => controller,
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);

      expect(getAllAndOverride).toHaveBeenCalledTimes(1);
      expect(getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        handler,
        controller,
      ]);
    });
  });

  describe('getRequest', () => {
    it('getRequest_whenContextIsGraphQL_shouldReturnGraphQLRequest', () => {
      const authenticatedUser: AuthenticatedUser = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
      };

      const request = {
        user: authenticatedUser,
      };

      const graphQLContext = {
        req: request,
      };

      const handler = jest.fn();
      const controller = jest.fn();

      const executionContext = {
        getType: () => 'graphql',
        getArgs: () => [{}, {}, graphQLContext, {}],
        getClass: () => controller,
        getHandler: () => handler,
      } as unknown as ExecutionContext;

      expect(guard.getRequest(executionContext)).toBe(request);
    });
  });
});
