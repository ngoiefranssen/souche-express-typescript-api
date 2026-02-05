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
import ProfileRole from './profile_role.model';
import ProfileModel from './profil.model';
import PermissionModel from '../permission/permission.model';
import RolePermission from '../permission/role_permission.model';

@Table({
  tableName: 'roles',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
})

export default class RoleModel extends Model {
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

  @BelongsToMany(() => PermissionModel, () => RolePermission)
  permissions?: PermissionModel[];
}