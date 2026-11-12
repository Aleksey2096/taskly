import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema, HydratedDocument } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

@Schema({
  timestamps: true,
})
export class Todo {
  @Prop({
    required: true,
    trim: true,
    maxLength: 120,
  })
  title!: string;

  @Prop({
    trim: true,
    maxLength: 2000,
  })
  description?: string;

  @Prop({
    default: false,
  })
  completed!: boolean;

  @Prop({
    type: Date,
  })
  dueDate?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  owner!: Types.ObjectId;
}

export type TodoDocument = HydratedDocument<Todo>;
export const TodoSchema = SchemaFactory.createForClass(Todo);

TodoSchema.index({
  owner: 1,
  createdAt: -1,
});
