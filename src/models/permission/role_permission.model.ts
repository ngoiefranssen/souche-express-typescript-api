import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  PrimaryKey,
  Index,
  BelongsTo,
} from 'sequelize-typescript';
import RoleModel from '../admin/role.model';
import PermissionModel from './permission.model';

/**
 * Table de liaison Many-to-Many entre Roles et Permissions
 * Permet d'attribuer des permissions à des rôles
 */
@Table({
  tableName: 'role_permissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export default class RolePermission extends Model {
  @PrimaryKey
  @ForeignKey(() => RoleModel)
  @Index('idx_role_permissions_role_id')
  @Column({
    type: DataType.INTEGER,
    field: 'role_id',
  })
  roleId!: number;

  @PrimaryKey
  @ForeignKey(() => PermissionModel)
  @Index('idx_role_permissions_permission_id')
  @Column({
    type: DataType.INTEGER,
    field: 'permission_id',
  })
  permissionId!: number;

  /**
   * Permet de surcharger les conditions ABAC au niveau du rôle
   * Si null, utilise les conditions de la permission
   */
  @Column({
    type: DataType.JSONB,
    allowNull: true,
    field: 'override_conditions',
  })
  overrideConditions?: Record<string, any>;

  /**
   * Permet de désactiver temporairement une permission pour un rôle
   */
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  })
  isActive!: boolean;

  /**
   * Date d'expiration de la permission (optionnel)
   */
  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'expires_at',
  })
  expiresAt?: Date;

  // Timestamps
  declare createdAt: Date;
  declare updatedAt: Date;

  // Relations
  @BelongsTo(() => RoleModel)
  role?: RoleModel;

  @BelongsTo(() => PermissionModel)
  permission?: PermissionModel;
}
