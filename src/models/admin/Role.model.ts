import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Unique,
  AllowNull,
  BelongsToMany,
} from 'sequelize-typescript';
import ProfileRole from './ProfileRole.model';
import ProfileModel from './Profil.model';

@Table({
  tableName: 'roles',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
})

export default class Role extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Unique
  @AllowNull(false)
  @Column({
    type: DataType.STRING(100),
    validate: {
      len: [2, 100],
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

  // Timestamps
  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt?: Date;

  // Relations
  @BelongsToMany(() => ProfileModel, () => ProfileRole, 'roleId', 'profileId')
  profiles?: ProfileModel[];
}