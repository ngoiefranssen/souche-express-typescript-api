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
  BelongsToMany,
} from 'sequelize-typescript';
import Role from './role.model';
import ProfileRole from './profile_role.model';
import User from './users.model';

@Table({
  tableName: 'profiles',
  timestamps: true,
  paranoid: true,
  underscored: false,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
})
export default class Profile extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Unique
  @AllowNull(false)
  @Column({
    type: DataType.STRING(100),
    validate: {
      len: [3, 100],
      notEmpty: true,
    },
  })
  label!: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING(200),
    validate: {
      len: [0, 200],
    },
  })
  description?: string;

  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt?: Date;

  // Relations
  @HasMany(() => User)
  users?: User[];

  @BelongsToMany(() => Role, () => ProfileRole)
  roles?: Role[];
}