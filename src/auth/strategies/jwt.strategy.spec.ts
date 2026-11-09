import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const jwtSecret = 'test-jwt-secret';

  const getOrThrow = jest.fn(() => jwtSecret);

  const configService = {
    getOrThrow,
  } as unknown as ConfigService;

  const userId = '507f1f77bcf86cd799439011';
  const email = 'test@example.com';

  beforeEach(() => {
    jest.clearAllMocks();

    getOrThrow.mockReturnValue(jwtSecret);

    strategy = new JwtStrategy(configService);
  });

  describe('constructor', () => {
    it('constructor_whenJwtSecretIsConfigured_shouldRetrieveJwtSecret', () => {
      expect(getOrThrow).toHaveBeenCalledTimes(1);
      expect(getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
    });
  });

  describe('validate', () => {
    it('validate_whenPayloadIsValid_shouldReturnAuthenticatedUser', () => {
      const payload = {
        sub: userId,
        email,
      };

      expect(strategy.validate(payload)).toEqual({
        id: userId,
        email,
      });
    });

    it('validate_whenUserIdIsUppercase_shouldAcceptValidObjectId', () => {
      const payload = {
        sub: '507F1F77BCF86CD799439011',
        email,
      };

      expect(strategy.validate(payload)).toEqual({
        id: '507F1F77BCF86CD799439011',
        email,
      });
    });

    it.each([
      {
        scenario: 'subject is missing',
        payload: { email },
      },
      {
        scenario: 'subject is not a string',
        payload: { sub: 123, email },
      },
      {
        scenario: 'subject is an invalid ObjectId',
        payload: { sub: 'invalid-id', email },
      },
      {
        scenario: 'subject is an empty string',
        payload: { sub: '', email },
      },
      {
        scenario: 'subject has an incorrect length',
        payload: { sub: '507f1f77bcf86cd79943901', email },
      },
      {
        scenario: 'email is missing',
        payload: { sub: userId },
      },
      {
        scenario: 'email is not a string',
        payload: { sub: userId, email: 123 },
      },
    ])(
      'validate_when$scenario_shouldThrowUnauthorizedException',
      ({ payload }) => {
        expect(() =>
          strategy.validate(payload as Parameters<JwtStrategy['validate']>[0]),
        ).toThrow(UnauthorizedException);
      },
    );
  });
});
