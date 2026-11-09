import { jest } from '@jest/globals';
import { AuthService } from '../auth.service';
import { AuthResolver } from './auth.resolver';

describe('AuthResolver', () => {
  let resolver: AuthResolver;

  const register = jest.fn<AuthService['register']>();
  const login = jest.fn<AuthService['login']>();

  const authService = {
    register,
    login,
  };

  const authPayload: Awaited<ReturnType<AuthService['register']>> = {
    accessToken: 'test-access-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: {
      id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      displayName: 'Test User',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    resolver = new AuthResolver(authService as unknown as AuthService);
  });

  describe('register', () => {
    it('should delegate registration to AuthService', async () => {
      const input = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
      } as Parameters<AuthResolver['register']>[0];

      register.mockResolvedValue(authPayload);

      await expect(resolver.register(input)).resolves.toEqual(authPayload);

      expect(register).toHaveBeenCalledTimes(1);
      expect(register).toHaveBeenCalledWith(input);
    });
  });

  describe('login', () => {
    it('should delegate authentication to AuthService', async () => {
      const input = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
      } as Parameters<AuthResolver['login']>[0];

      login.mockResolvedValue(authPayload);

      await expect(resolver.login(input)).resolves.toEqual(authPayload);

      expect(login).toHaveBeenCalledTimes(1);
      expect(login).toHaveBeenCalledWith(input);
    });
  });
});
