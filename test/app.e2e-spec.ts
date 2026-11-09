import { jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { User } from '../src/user/schemas/user.schema';

jest.setTimeout(60_000);

interface GraphQLError {
  message: string;
  extensions?: {
    code?: string;
  };
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

interface AuthResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

const REGISTER_MUTATION = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      tokenType
      expiresIn
      user {
        id
        email
        displayName
      }
    }
  }
`;

const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      tokenType
      expiresIn
      user {
        id
        email
        displayName
      }
    }
  }
`;

const ME_QUERY = `
  query GetCurrentUser {
    me {
      id
      email
      displayName
    }
  }
`;

const UPDATE_ME_MUTATION = `
  mutation UpdateCurrentUser($input: UpdateUserInput!) {
    updateMe(input: $input) {
      id
      email
      displayName
    }
  }
`;

const CREATE_TODO_MUTATION = `
  mutation CreateTodo($input: CreateTodoInput!) {
    createTodo(input: $input) {
      id
      title
      description
      completed
      dueDate
    }
  }
`;

const TODOS_QUERY = `
  query GetTodos {
    todos {
      id
      title
      description
      completed
      dueDate
    }
  }
`;

const TODO_QUERY = `
  query GetTodo($id: ID!) {
    todo(id: $id) {
      id
      title
      description
      completed
      dueDate
    }
  }
`;

const UPDATE_TODO_MUTATION = `
  mutation UpdateTodo($id: ID!, $input: UpdateTodoInput!) {
    updateTodo(id: $id, input: $input) {
      id
      title
      description
      completed
      dueDate
    }
  }
`;

const DELETE_TODO_MUTATION = `
  mutation DeleteTodo($id: ID!) {
    deleteTodo(id: $id)
  }
`;

let userModel: Model<User>;

describe('GraphQL API (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let mongoServer: MongoMemoryServer;
  let connection: Connection;

  async function execute<T>(
    query: string,
    variables: Record<string, unknown> = {},
    accessToken?: string,
  ): Promise<GraphQLResponse<T>> {
    const httpRequest = request(app.getHttpServer()).post('/graphql').send({
      query,
      variables,
    });

    if (accessToken) {
      httpRequest.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await httpRequest.expect(200);

    return response.body as GraphQLResponse<T>;
  }

  async function registerUser(email: string): Promise<string> {
    const response = await execute<{
      register: AuthResult;
    }>(REGISTER_MUTATION, {
      input: {
        email,
        password: 'StrongPassword123!',
        displayName: 'Test User',
      },
    });

    const accessToken = response.data?.register.accessToken;

    if (!accessToken) {
      const errors = response.errors?.map((error) => error.message).join('; ');

      throw new Error(
        `Test user registration failed: ${errors ?? 'No access token returned'}`,
      );
    }

    return accessToken;
  }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    process.env.MONGODB_URI = mongoServer.getUri('taskly-test');
    process.env.JWT_SECRET = 'test-jwt-secret-for-automated-tests';
    process.env.NODE_ENV = 'test';

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Keep the global validation configuration consistent with main.ts.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());

    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
  });

  beforeEach(async () => {
    await connection.dropDatabase();
  });

  afterAll(async () => {
    await app?.close();
    await mongoServer?.stop();
  });

  describe('authentication', () => {
    it('register_whenInputIsValid_shouldCreateUserAndReturnAccessToken', async () => {
      const email = 'register@example.com';

      const response = await execute<{
        register: AuthResult;
      }>(REGISTER_MUTATION, {
        input: {
          email,
          password: 'StrongPassword123!',
          displayName: 'Test User',
        },
      });

      expect(response.errors).toBeUndefined();
      expect(response.data?.register).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          tokenType: 'Bearer',
          expiresIn: 900,
          user: expect.objectContaining({
            id: expect.any(String),
            email,
            displayName: 'Test User',
          }),
        }),
      );
    });

    it('login_whenCredentialsAreValid_shouldReturnAccessToken', async () => {
      const email = 'login@example.com';
      const password = 'StrongPassword123!';

      await registerUser(email);

      const response = await execute<{
        login: AuthResult;
      }>(LOGIN_MUTATION, {
        input: {
          email,
          password,
        },
      });

      expect(response.errors).toBeUndefined();
      expect(response.data?.login.accessToken).toEqual(expect.any(String));
      expect(response.data?.login.tokenType).toBe('Bearer');
      expect(response.data?.login.user.email).toBe(email);
    });

    it('me_whenAccessTokenIsValid_shouldReturnCurrentUser', async () => {
      const email = 'current-user@example.com';
      const accessToken = await registerUser(email);

      const response = await execute<{
        me: {
          id: string;
          email: string;
          displayName: string;
        };
      }>(ME_QUERY, {}, accessToken);

      expect(response.errors).toBeUndefined();
      expect(response.data?.me).toEqual(
        expect.objectContaining({
          email,
          displayName: 'Test User',
        }),
      );
    });

    it('me_whenAccessTokenIsMissing_shouldRejectRequest', async () => {
      const response = await execute<{
        me: unknown;
      }>(ME_QUERY);

      expect(response.errors).toBeDefined();
      expect(response.errors?.length).toBeGreaterThan(0);
    });

    it('updateMe_whenAccessTokenIsValid_shouldUpdateCurrentUser', async () => {
      const accessToken = await registerUser('update-user@example.com');

      const response = await execute<{
        updateMe: {
          id: string;
          email: string;
          displayName: string;
        };
      }>(
        UPDATE_ME_MUTATION,
        {
          input: {
            displayName: 'Updated User',
          },
        },
        accessToken,
      );

      expect(response.errors).toBeUndefined();
      expect(response.data?.updateMe.displayName).toBe('Updated User');

      const meResponse = await execute<{
        me: {
          displayName: string;
        };
      }>(ME_QUERY, {}, accessToken);

      expect(meResponse.data?.me.displayName).toBe('Updated User');
    });

    it('register_whenEmailAlreadyExists_shouldRejectRegistration', async () => {
      const email = 'duplicate@example.com';

      await registerUser(email);

      const response = await execute(REGISTER_MUTATION, {
        input: {
          email,
          password: 'AnotherPassword123!',
          displayName: 'Another User',
        },
      });

      expect(response.errors).toBeDefined();
      expect(response.errors?.length).toBeGreaterThan(0);
    });

    it('login_whenPasswordIsIncorrect_shouldRejectAuthentication', async () => {
      const email = 'wrong-password@example.com';

      await registerUser(email);

      const response = await execute(LOGIN_MUTATION, {
        input: {
          email,
          password: 'IncorrectPassword123!',
        },
      });

      expect(response.errors).toBeDefined();
      expect(response.errors?.length).toBeGreaterThan(0);
    });

    it('register_whenInputIsValid_shouldPersistHashedPassword', async () => {
      const email = 'hashed-password@example.com';
      const password = 'StrongPassword123!';

      const response = await execute<{
        register: AuthResult;
      }>(REGISTER_MUTATION, {
        input: {
          email,
          password,
          displayName: 'Test User',
        },
      });

      expect(response.errors).toBeUndefined();

      const persistedUser = await userModel
        .findOne({ email })
        .select('+passwordHash')
        .exec();

      expect(persistedUser).not.toBeNull();
      expect(persistedUser!.passwordHash).toEqual(expect.any(String));
      expect(persistedUser!.passwordHash).not.toBe(password);
    });
  });

  describe('todos', () => {
    it('todoLifecycle_whenUserIsAuthenticated_shouldCreateReadUpdateAndDeleteTodo', async () => {
      const accessToken = await registerUser('todo-lifecycle@example.com');

      // Create.
      const createResponse = await execute<{
        createTodo: {
          id: string;
          title: string;
          description: string;
          completed: boolean;
        };
      }>(
        CREATE_TODO_MUTATION,
        {
          input: {
            title: 'Prepare test cases',
            description: 'Write GraphQL integration tests',
          },
        },
        accessToken,
      );

      expect(createResponse.errors).toBeUndefined();

      const createdTodo = createResponse.data?.createTodo;

      expect(createdTodo).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: 'Prepare test cases',
          description: 'Write GraphQL integration tests',
          completed: false,
        }),
      );

      const todoId = createdTodo!.id;

      // Read all todos.
      const listResponse = await execute<{
        todos: Array<{
          id: string;
          title: string;
        }>;
      }>(TODOS_QUERY, {}, accessToken);

      expect(listResponse.errors).toBeUndefined();
      expect(listResponse.data?.todos).toHaveLength(1);
      expect(listResponse.data?.todos[0].id).toBe(todoId);

      // Read one todo.
      const readResponse = await execute<{
        todo: {
          id: string;
          title: string;
        };
      }>(
        TODO_QUERY,
        {
          id: todoId,
        },
        accessToken,
      );

      expect(readResponse.errors).toBeUndefined();
      expect(readResponse.data?.todo.title).toBe('Prepare test cases');

      // Update.
      const updateResponse = await execute<{
        updateTodo: {
          id: string;
          title: string;
          completed: boolean;
        };
      }>(
        UPDATE_TODO_MUTATION,
        {
          id: todoId,
          input: {
            title: 'Prepare GraphQL test cases',
            completed: true,
          },
        },
        accessToken,
      );

      expect(updateResponse.errors).toBeUndefined();
      expect(updateResponse.data?.updateTodo).toEqual(
        expect.objectContaining({
          id: todoId,
          title: 'Prepare GraphQL test cases',
          completed: true,
        }),
      );

      // Delete.
      const deleteResponse = await execute<{
        deleteTodo: boolean;
      }>(
        DELETE_TODO_MUTATION,
        {
          id: todoId,
        },
        accessToken,
      );

      expect(deleteResponse.errors).toBeUndefined();
      expect(deleteResponse.data?.deleteTodo).toBe(true);

      // Verify the deletion persisted.
      const finalListResponse = await execute<{
        todos: unknown[];
      }>(TODOS_QUERY, {}, accessToken);

      expect(finalListResponse.errors).toBeUndefined();
      expect(finalListResponse.data?.todos).toEqual([]);
    });

    it('todos_whenUserHasNoTodos_shouldReturnEmptyArray', async () => {
      const accessToken = await registerUser('empty-todos@example.com');

      const response = await execute<{
        todos: unknown[];
      }>(TODOS_QUERY, {}, accessToken);

      expect(response.errors).toBeUndefined();
      expect(response.data?.todos).toEqual([]);
    });

    it('todo_whenIdIsInvalid_shouldReturnGraphQLError', async () => {
      const accessToken = await registerUser('invalid-id@example.com');

      const response = await execute<{
        todo: unknown;
      }>(
        TODO_QUERY,
        {
          id: 'invalid-id',
        },
        accessToken,
      );

      expect(response.errors).toBeDefined();
      expect(response.errors?.length).toBeGreaterThan(0);
    });

    it('createTodo_whenInputIsInvalid_shouldReturnValidationError', async () => {
      const accessToken = await registerUser('validation@example.com');

      const response = await execute(
        CREATE_TODO_MUTATION,
        {
          input: {
            title: '',
          },
        },
        accessToken,
      );

      expect(response.errors).toBeDefined();
      expect(response.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('todo ownership', () => {
    it('todoOperations_whenTodoBelongsToAnotherUser_shouldDenyAccess', async () => {
      const ownerToken = await registerUser('owner@example.com');

      const otherUserToken = await registerUser('another-user@example.com');

      const createResponse = await execute<{
        createTodo: {
          id: string;
          title: string;
        };
      }>(
        CREATE_TODO_MUTATION,
        {
          input: {
            title: 'Private todo',
          },
        },
        ownerToken,
      );

      expect(createResponse.errors).toBeUndefined();

      const todoId = createResponse.data!.createTodo.id;

      // The other user must not see the owner's todos in the list.
      const listResponse = await execute<{
        todos: unknown[];
      }>(TODOS_QUERY, {}, otherUserToken);

      expect(listResponse.errors).toBeUndefined();
      expect(listResponse.data?.todos).toEqual([]);

      // The other user must not be able to read the todo by ID.
      const readResponse = await execute<{
        todo: unknown;
      }>(
        TODO_QUERY,
        {
          id: todoId,
        },
        otherUserToken,
      );

      expect(readResponse.errors).toBeDefined();

      // The other user must not be able to update it.
      const updateResponse = await execute(
        UPDATE_TODO_MUTATION,
        {
          id: todoId,
          input: {
            title: 'Unauthorized update',
          },
        },
        otherUserToken,
      );

      expect(updateResponse.errors).toBeDefined();

      // The other user must not be able to delete it.
      const deleteResponse = await execute(
        DELETE_TODO_MUTATION,
        {
          id: todoId,
        },
        otherUserToken,
      );

      expect(deleteResponse.errors).toBeDefined();

      // Verify that the original todo still belongs to its owner
      // and that its data has not been changed.
      const ownerReadResponse = await execute<{
        todo: {
          title: string;
        };
      }>(
        TODO_QUERY,
        {
          id: todoId,
        },
        ownerToken,
      );

      expect(ownerReadResponse.errors).toBeUndefined();
      expect(ownerReadResponse.data?.todo.title).toBe('Private todo');
    });
  });
});
