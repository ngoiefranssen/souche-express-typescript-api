import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import ProfileModel from './profil.model';
import Role from './role.model';

@Table({
  tableName: 'profile_roles',
  timestamps: true,
  paranoid: false,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['profile_id', 'role_id'],
      name: 'unique_profile_role',
    },
  ],
})

export default class ProfileRoleModel extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'id',
  })
  id!: number;

  @ForeignKey(() => ProfileModel)
  @AllowNull(false)
  @Index('idx_profile_roles_profile_id')
  @Column({
    type: DataType.INTEGER,
    field: 'profile_id',
  })
  profile_id!: number;

  @ForeignKey(() => Role)
  @AllowNull(false)
  @Index('idx_profile_roles_role_id')
  @Column({
    type: DataType.INTEGER,
    field: 'role_id',
  })
  roleId!: number;

  // Timestamps automatiques
  declare createdAt: Date;
  declare updatedAt: Date;

  // Relations (optionnel mais utile)
  @BelongsTo(() => ProfileModel)
  profile?: ProfileModel;

  @BelongsTo(() => Role)
  role?: Role;
}

