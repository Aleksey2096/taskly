import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TodoService } from './todo.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { Types } from 'mongoose';
import { UpdateTodoDto } from './dto/update-todo.dto';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('todos')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Post()
  create(
    @Body() createTodoDto: CreateTodoDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.todoService.create(
      createTodoDto,
      new Types.ObjectId(currentUser.id),
    );
  }

  @Get()
  findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.todoService.findAllByOwner(new Types.ObjectId(currentUser.id));
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.todoService.findOne(id, new Types.ObjectId(currentUser.id));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDotoDto: UpdateTodoDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.todoService.update(
      id,
      updateDotoDto,
      new Types.ObjectId(currentUser.id),
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.todoService.remove(id, new Types.ObjectId(currentUser.id));
  }
}
