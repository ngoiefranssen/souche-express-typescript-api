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
  Index,
} from 'sequelize-typescript';
import RoleModel from '../admin/role.model';
import RolePermission from './role_permission.model';

/**
 * Modèle Permission - Gestion granulaire des droits d'accès
 * Format des permissions: "resource:action"
 * Exemples: "users:read", "users:create", "profiles:*", "audit:read"
 */
@Table({
  tableName: 'permissions',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
})
export default class PermissionModel extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  /**
   * Nom unique de la permission (ex: "users:create")
   */
  @Unique
  @AllowNull(false)
  @Index('idx_permissions_name')
  @Column({
    type: DataType.STRING(100),
    validate: {
      len: [2, 100],
      notEmpty: true,
      // Format: resource:action
      is: {
        args: /^[a-z_]+:(read|create|update|delete|\*|execute|manage)$/i,
        msg: 'Permission format must be "resource:action" (ex: users:read)',
      },
    },
  })
  name!: string;

  /**
   * Ressource concernée (ex: "users", "profiles", "audit")
   */
  @AllowNull(false)
  @Index('idx_permissions_resource')
  @Column({
    type: DataType.STRING(50),
    validate: {
      len: [2, 50],
      notEmpty: true,
    },
  })
  resource!: string;

  /**
   * Action autorisée (read, create, update, delete, *, execute, manage)
   */
  @AllowNull(false)
  @Index('idx_permissions_action')
  @Column({
    type: DataType.ENUM('read', 'create', 'update', 'delete', '*', 'execute', 'manage'),
  })
  action!: 'read' | 'create' | 'update' | 'delete' | '*' | 'execute' | 'manage';

  /**
   * Description de la permission
   */
  @AllowNull(true)
  @Column({
    type: DataType.STRING(255),
  })
  description?: string;

  /**
   * Catégorie de la permission (pour organiser l'interface)
   */
  @AllowNull(true)
  @Index('idx_permissions_category')
  @Column({
    type: DataType.STRING(50),
  })
  category?: string;

  /**
   * Niveau de priorité (0 = faible, 100 = élevé)
   * Utilisé pour résoudre les conflits de permissions
   */
  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    defaultValue: 50,
    validate: {
      min: 0,
      max: 100,
    },
  })
  priority!: number;

  /**
   * Indique si la permission est système (non supprimable)
   */
  @AllowNull(false)
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    field: 'is_system',
  })
  isSystem!: boolean;

  /**
   * Conditions ABAC en JSON
   * Exemple: { "department": "IT", "region": ["EU", "US"], "clearanceLevel": { "gte": 3 } }
   */
  @AllowNull(true)
  @Column({
    type: DataType.JSONB,
    defaultValue: {},
  })
  conditions?: Record<string, any>;

  // Timestamps
  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt?: Date;

  // Relations
  @BelongsToMany(() => RoleModel, () => RolePermission)
  roles?: RoleModel[];
}
