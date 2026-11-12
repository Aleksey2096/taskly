import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { UpdateUserInput } from '../dto/update-user.input';
import { UserType } from '../graphql/user.type';
import { UserDocument } from '../schemas/user.schema';
import { UserService } from '../user.service';
import { NotFoundException } from '@nestjs/common';

@Resolver(() => UserType)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => UserType)
  async me(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserDocument> {
    const user = await this.userService.findById(currentUser.id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  @Mutation(() => UserType)
  async updateMe(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args('input') input: UpdateUserInput,
  ): Promise<UserDocument> {
    const updatedUser = await this.userService.update(currentUser.id, input);

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }
}
