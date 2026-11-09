import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

interface GraphQLContext {
  req: {
    user: AuthenticatedUser;
  };
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const gqlContext = GqlExecutionContext.create(context);

    return gqlContext.getContext<GraphQLContext>().req.user;
  },
);
