import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, MaxLength } from 'class-validator';

@InputType('LoginInput')
export class LoginInput {
  @Field()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Field()
  @IsString()
  @MaxLength(128)
  password!: string;
}
