import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Todo, TodoDocument } from './schemas/todo.schema';
import { Model, Types } from 'mongoose';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Injectable()
export class TodoService {
  constructor(
    @InjectModel(Todo.name) private readonly todoModel: Model<Todo>,
  ) {}

  async create(
    createTodoDto: CreateTodoDto,
    ownerId: Types.ObjectId,
  ): Promise<TodoDocument> {
    return this.todoModel.create({
      ...createTodoDto,
      owner: ownerId,
    });
  }

  async findAllByOwner(ownerId: Types.ObjectId): Promise<TodoDocument[]> {
    return this.todoModel
      .find({ owner: ownerId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, ownerId: Types.ObjectId): Promise<TodoDocument> {
    const todo = await this.todoModel
      .findOne({
        _id: id,
        owner: ownerId,
      })
      .exec();

    if (!todo) {
      throw new NotFoundException(`Todo with ID ${id} not found!`);
    }

    return todo;
  }

  async update(
    id: string,
    updateTodoDto: UpdateTodoDto,
    ownerId: Types.ObjectId,
  ): Promise<TodoDocument> {
    const todo = await this.todoModel
      .findOneAndUpdate(
        {
          _id: id,
          owner: ownerId,
        },
        updateTodoDto,
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!todo) {
      throw new NotFoundException(`Todo with ID ${id} not found!`);
    }

    return todo;
  }

  async remove(id: string, ownerId: Types.ObjectId): Promise<void> {
    const result = await this.todoModel
      .deleteOne({
        _id: id,
        owner: ownerId,
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Todo with ID ${id} not found!`);
    }
  }
}
