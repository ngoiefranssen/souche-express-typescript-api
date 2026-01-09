import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Unique,
  AllowNull,
  HasMany,
} from 'sequelize-typescript';
import User from './users.model';

@Table({
  tableName: 'employment_statuses',
  timestamps: false,
  underscored: false,
})

export default class EmploymentStatusModel extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Unique
  @AllowNull(false)
  @Column({
    type: DataType.STRING(100),
    validate: {
      notEmpty: {
        msg: 'Label cannot be empty',
      },
    },
  })
  label!: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING(200),
  })
  description?: string;

  // Relations
  @HasMany(() => User)
  users?: User[];
}