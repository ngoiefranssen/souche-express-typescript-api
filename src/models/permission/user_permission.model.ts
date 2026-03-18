import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  PrimaryKey,
  BelongsTo,
} from 'sequelize-typescript';
import UserModel from '../admin/users.model';
import PermissionModel from './permission.model';

/**
 * Table de liaison Many-to-Many entre Utilisateurs et Permissions
 * Permet d'accorder des permissions directes à un utilisateur.
 */
@Table({
  tableName: 'user_permissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export default class UserPermission extends Model {
  @PrimaryKey
  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  userId!: number;

  @PrimaryKey
  @ForeignKey(() => PermissionModel)
  @Column({
    type: DataType.INTEGER,
    field: 'permission_id',
  })
  permissionId!: number;

  /**
   * Permet de surcharger les conditions ABAC au niveau utilisateur
   * Si null, utilise les conditions de la permission
   */
  @Column({
    type: DataType.JSONB,
    allowNull: true,
    field: 'override_conditions',
  })
  overrideConditions?: Record<string, unknown>;

  /**
   * Permet de désactiver temporairement une permission pour un utilisateur
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
  @BelongsTo(() => UserModel)
  user?: UserModel;

  @BelongsTo(() => PermissionModel)
  permission?: PermissionModel;
}
