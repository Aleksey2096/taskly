import { Field, ObjectType } from '@nestjs/graphql';

import { UserType } from '../../user/graphql/user.type';

@ObjectType('AuthPayload')
export class AuthPayload {
  @Field()
  accessToken!: string;

  @Field()
  tokenType!: string;

  @Field()
  expiresIn!: number;

  @Field(() => UserType)
  user!: UserType;
}
