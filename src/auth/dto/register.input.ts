import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

@InputType('RegisterInput')
export class RegisterInput {
  @Field()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;
}
