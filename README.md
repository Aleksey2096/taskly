# Taskly

Taskly is a task-management backend built with **NestJS**, **TypeScript**, **GraphQL**, and **MongoDB**. It provides user authentication and profile management together with CRUD operations for personal to-do items. The API uses JWT-based authentication and restricts each user to their own tasks.

## Features

- **User registration and login** using email and password.
- **Password hashing** with Argon2.
- **JWT authentication** for protected GraphQL operations.
- **User profile operations**, including retrieving and updating the authenticated user's profile.
- **Todo management**: create, retrieve, list, update, and delete tasks.
- **Per-user data access**: todo queries and mutations are scoped to the authenticated user's ID.
- **Input validation** through NestJS validation pipes and DTOs.
- **Automated tests** covering services and GraphQL application flows.
- **Docker Compose support** for running the application with MongoDB.

## Technology stack

| Area | Technology |
|---|---|
| Runtime | Node.js 26 |
| Language | TypeScript |
| Backend framework | NestJS |
| API | GraphQL with Apollo Server |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | Passport JWT |
| Password hashing | Argon2 |
| Validation | `class-validator` / NestJS `ValidationPipe` |
| Testing | Jest, ts-jest, Supertest, MongoDB Memory Server |
| Containerization | Docker, Docker Compose |

The project has been developed with Node.js `26.13.0`, TypeScript `6.0.3`, and the NestJS/Apollo/Mongoose dependencies specified in `package.json`.

## Application structure

The application is organized into NestJS modules and follows the framework's dependency-injection model.

- **Auth** — registration, login, password verification, JWT creation, and authentication guards/strategy.
- **User** — retrieving and updating the currently authenticated user's profile.
- **Todo** — task creation and retrieval, updates, deletion, and ownership checks.
- **AppModule** — application-level configuration, MongoDB connection, GraphQL configuration, and feature-module registration.
- **`main.ts`** — application bootstrap and global request validation.

GraphQL replaces a traditional REST-controller API. The GraphQL schema is generated from the application's resolver and DTO definitions.

## Requirements

For running the application directly on your machine:

- Node.js `26.x` (the project has been tested with `26.13.0`).
- npm.
- MongoDB running locally or an accessible MongoDB instance.

For the containerized setup:

- Docker Engine or Docker Desktop.
- Docker Compose v2.

## Getting started

### 1. Clone the repository

```bash
git clone <repository-url>
cd taskly
```

### 2. Install dependencies

```bash
npm ci
```

`npm ci` uses the committed `package-lock.json` to install the dependency versions recorded by the project.

### 3. Configure environment variables

Create a local `.env` file in the project root:

```bash
cp .env.example .env
```

For running the application directly on your machine, configure the following values. The MongoDB URI below assumes a local MongoDB instance without authentication.

```dotenv
PORT=3000
JWT_SECRET=replace_with_a_long_random_secret
MONGODB_URI=mongodb://127.0.0.1:27017/taskly
```

Generate a strong JWT secret with:

```bash
openssl rand -hex 32
```

Do not commit `.env` or put real credentials in source control.

### 4. Start MongoDB

Make sure MongoDB is running and that the database URI configured in `MONGODB_URI` is reachable from the application.

### 5. Run the application

Start the application in development mode:

```bash
npm run start:dev
```

Build the application:

```bash
npm run build
```

Run the compiled application:

```bash
npm run start:prod
```

## GraphQL API

The GraphQL endpoint is available at:

```text
http://localhost:3000/graphql
```

In non-production environments, GraphiQL and schema introspection are enabled. You can use the GraphiQL interface to explore the available queries, mutations, input types, and return fields.

The API exposes operations for the following areas:

| Area | Operations |
|---|---|
| Authentication | Register an account and log in to obtain an access token. |
| User | Retrieve the current user's profile and update it. |
| Todos | List the current user's todos, retrieve one todo, create, update, and delete todos. |

Protected operations require the JWT access token in the HTTP `Authorization` header:

```http
Authorization: Bearer <access-token>
```

The token is returned by the login flow. The application uses a global JWT guard for protected operations, while explicitly public authentication operations can bypass the guard.

## Authentication and authorization

Passwords are hashed with Argon2 before being stored. Plain-text passwords are never intended to be persisted.

After successful authentication, the API issues a signed JWT. The authenticated user's identity is extracted from the token and made available to GraphQL resolvers. Todo service operations use both the todo ID and the authenticated user's ID when reading, updating, or deleting a task. This prevents a user from accessing or modifying another user's todos by supplying a different todo ID.

## Validation and runtime configuration

The application configures a global NestJS `ValidationPipe` with:

- `whitelist: true` — removes properties that are not declared by the input DTO.
- `forbidNonWhitelisted: true` — rejects requests containing undeclared properties.
- `transform: true` — transforms incoming values to the DTO types when applicable.

GraphQL schema behavior depends on `NODE_ENV`:

- In development, the schema is written to `src/schema.gql`; GraphiQL and introspection are enabled.
- In production, the schema is generated in memory; GraphiQL and introspection are disabled.

The application listens on `0.0.0.0` and uses port `3000` by default. Set `PORT` to override it.

## Running with Docker Compose

Docker Compose starts the NestJS application and MongoDB as separate containers. The application connects to MongoDB using the Compose service hostname (`mongo`), and MongoDB data is stored in a named Docker volume.

### 1. Configure Docker environment variables

Create `.env` from the example file if you have not already:

```bash
cp .env.example .env
```

Set values similar to the following in `.env`:

```dotenv
APP_PORT=3000
JWT_SECRET=replace_with_a_long_random_secret
MONGO_INITDB_ROOT_USERNAME=taskly_admin
MONGO_INITDB_ROOT_PASSWORD=replace_with_a_strong_password
```

Use generated secrets rather than the sample values. Prefer a password made of URL-safe characters when the Compose file builds the MongoDB connection URI from the username and password.

### 2. Build and start the containers

```bash
docker compose up --build -d
```

Check container status:

```bash
docker compose ps
```

Follow application logs:

```bash
docker compose logs -f app
```

The GraphQL endpoint will be available at `http://localhost:3000/graphql` when `APP_PORT` is set to `3000`. If you change `APP_PORT`, use that host port instead.

### 3. Stop the containers

```bash
docker compose down
```

To remove the MongoDB data volume as well:

```bash
docker compose down -v
```

> **Warning:** `docker compose down -v` deletes the named MongoDB volume and its stored database data. Use it only when you intend to reset the database.

### MongoDB access from a local database client

If the Compose file publishes MongoDB on `127.0.0.1:27017`, a local client such as MongoDB Compass can connect through `localhost:27017` using the credentials configured in `.env`. The database is otherwise reachable by the application through the internal Docker network and the hostname `mongo`.

## Testing

Run the unit test suite:

```bash
npm test -- --runInBand
```

Run end-to-end tests (if the `test:e2e` script is present in `package.json`):

```bash
npm run test:e2e -- --runInBand
```

Generate test coverage (if the `test:cov` script is present):

```bash
npm run test:cov
```

The end-to-end tests use an isolated MongoDB test instance, so they do not need to use the development database configured in `.env`.

## Useful commands

| Command | Description |
|---|---|
| `npm ci` | Install locked dependencies. |
| `npm run start:dev` | Start the application in development mode with file watching. |
| `npm run build` | Compile the TypeScript application. |
| `npm run start:prod` | Run the compiled application. |
| `npm test -- --runInBand` | Run unit tests sequentially. |
| `docker compose up --build -d` | Build and start the application and database containers. |
| `docker compose logs -f app` | Follow application logs. |
| `docker compose down` | Stop and remove the containers and network. |

## Security notes

- Keep `JWT_SECRET` private and use a different value for each environment.
- Never commit `.env` files or production credentials.
- Use HTTPS when exposing the API outside a trusted local development environment.
- Keep GraphiQL and GraphQL introspection disabled in production unless there is a deliberate operational reason to enable them.
- Back up the MongoDB data volume before performing destructive database or container maintenance.

## License

No license has been specified for this project yet. Add a `LICENSE` file and update this section before distributing the application if you intend to publish it under an open-source license.
