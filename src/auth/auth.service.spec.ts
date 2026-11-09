import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jest } from '@jest/globals';
import * as argon2 from 'argon2';
import { UserService } from '../user/user.service';
import type { UserDocument } from '../user/schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;

  const findByEmail =
    jest.fn<
      (
        ...args: Parameters<UserService['findByEmail']>
      ) => Promise<Awaited<ReturnType<UserService['findByEmail']>> | null>
    >();

  const findByEmailForAuthentication =
    jest.fn<
      (
        ...args: Parameters<UserService['findByEmailForAuthentication']>
      ) => Promise<Awaited<
        ReturnType<UserService['findByEmailForAuthentication']>
      > | null>
    >();

  const create = jest.fn<UserService['create']>();

  const signAsync = jest.fn<JwtService['signAsync']>();

  const userService = {
    findByEmail,
    findByEmailForAuthentication,
    create,
  };

  const jwtService = {
    signAsync,
  };

  const userId = '507f1f77bcf86cd799439011';
  const email = 'test@example.com';
  const displayName = 'Test User';
  const password = 'StrongPassword123!';

  const user = {
    id: userId,
    email,
    displayName,
    passwordHash: 'test-password-hash',
  } as unknown as UserDocument;

  const accessToken = 'test-access-token';

  beforeEach(() => {
    jest.clearAllMocks();

    authService = new AuthService(
      userService as unknown as UserService,
      jwtService as unknown as JwtService,
    );
  });

  describe('register', () => {
    it('register_whenInputIsValid_shouldCreateUserAndReturnAuthResponse', async () => {
      const input = {
        email: '  TEST@EXAMPLE.COM  ',
        password,
        displayName: '  Test User  ',
      } as RegisterDto;

      findByEmail.mockResolvedValue(null);

      create.mockResolvedValue(
        user as Awaited<ReturnType<UserService['create']>>,
      );

      signAsync.mockResolvedValue(accessToken);

      const result = await authService.register(input);

      expect(findByEmail).toHaveBeenCalledTimes(1);
      expect(findByEmail).toHaveBeenCalledWith(email);

      expect(create).toHaveBeenCalledTimes(1);

      const createInput = create.mock.calls[0][0];

      expect(createInput.email).toBe(email);
      expect(createInput.displayName).toBe(displayName);
      expect(createInput.passwordHash).not.toBe(password);

      // Verify that the stored password hash is a valid Argon2 hash.
      await expect(
        argon2.verify(createInput.passwordHash, password),
      ).resolves.toBe(true);

      expect(signAsync).toHaveBeenCalledWith({
        sub: userId,
        email,
      });

      expect(result).toEqual({
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 900,
        user: {
          id: userId,
          email,
          displayName,
        },
      });
    });

    it('register_whenEmailAlreadyExists_shouldThrowConflictException', async () => {
      const input = {
        email,
        password,
        displayName,
      } as RegisterDto;

      findByEmail.mockResolvedValue(
        user as Awaited<ReturnType<UserService['findByEmail']>>,
      );

      await expect(authService.register(input)).rejects.toThrow(
        ConflictException,
      );

      expect(findByEmail).toHaveBeenCalledWith(email);
      expect(create).not.toHaveBeenCalled();
      expect(signAsync).not.toHaveBeenCalled();
    });

    it('register_whenDuplicateEmailIsDetectedDuringCreation_shouldThrowConflictException', async () => {
      const input = {
        email,
        password,
        displayName,
      } as RegisterDto;

      findByEmail.mockResolvedValue(null);

      create.mockRejectedValue({
        code: 11000,
      });

      await expect(authService.register(input)).rejects.toThrow(
        ConflictException,
      );

      expect(create).toHaveBeenCalledTimes(1);
      expect(signAsync).not.toHaveBeenCalled();
    });

    it('register_whenCreationFailsForAnotherReason_shouldRethrowOriginalError', async () => {
      const input = {
        email,
        password,
        displayName,
      } as RegisterDto;

      const error = new Error('Database connection failed');

      findByEmail.mockResolvedValue(null);
      create.mockRejectedValue(error);

      await expect(authService.register(input)).rejects.toBe(error);

      expect(signAsync).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('login_whenCredentialsAreValid_shouldReturnAuthResponse', async () => {
      const input = {
        email: '  TEST@EXAMPLE.COM  ',
        password,
      } as LoginDto;

      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
      });

      const authenticatedUser = {
        ...user,
        passwordHash,
      };

      findByEmailForAuthentication.mockResolvedValue(
        authenticatedUser as Awaited<
          ReturnType<UserService['findByEmailForAuthentication']>
        >,
      );

      signAsync.mockResolvedValue(accessToken);

      const result = await authService.login(input);

      expect(findByEmailForAuthentication).toHaveBeenCalledTimes(1);
      expect(findByEmailForAuthentication).toHaveBeenCalledWith(email);

      expect(signAsync).toHaveBeenCalledWith({
        sub: userId,
        email,
      });

      expect(result).toEqual({
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 900,
        user: {
          id: userId,
          email,
          displayName,
        },
      });
    });

    it('login_whenUserDoesNotExist_shouldThrowUnauthorizedException', async () => {
      const input = {
        email,
        password,
      } as LoginDto;

      findByEmailForAuthentication.mockResolvedValue(null);

      await expect(authService.login(input)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(findByEmailForAuthentication).toHaveBeenCalledWith(email);

      expect(signAsync).not.toHaveBeenCalled();
    });

    it('login_whenPasswordIsIncorrect_shouldThrowUnauthorizedException', async () => {
      const input = {
        email,
        password: 'IncorrectPassword123!',
      } as LoginDto;

      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
      });

      const authenticatedUser = {
        ...user,
        passwordHash,
      };

      findByEmailForAuthentication.mockResolvedValue(
        authenticatedUser as Awaited<
          ReturnType<UserService['findByEmailForAuthentication']>
        >,
      );

      await expect(authService.login(input)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(signAsync).not.toHaveBeenCalled();
    });
  });
});
