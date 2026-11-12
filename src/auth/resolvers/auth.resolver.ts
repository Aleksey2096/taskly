import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Public } from '../decorators/public.decorator';
import { LoginInput } from '../dto/login.input';
import { RegisterInput } from '../dto/register.input';
import { AuthPayload } from '../graphql/auth-payload.type';
import { AuthService } from '../auth.service';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Mutation(() => AuthPayload)
  register(@Args('input') input: RegisterInput): Promise<AuthPayload> {
    return this.authService.register(input);
  }

  @Public()
  @Mutation(() => AuthPayload)
  login(@Args('input') input: LoginInput): Promise<AuthPayload> {
    return this.authService.login(input);
  }
}
