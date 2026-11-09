import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  findMe(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.userService.findById(currentUser.id);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(currentUser.id, updateUserDto);
  }
}
