import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Todo')
export class TodoType {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  completed!: boolean;

  @Field(() => GraphQLISODateTime, {
    nullable: true,
  })
  dueDate?: Date;
}
