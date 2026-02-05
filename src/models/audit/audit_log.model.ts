/**
 * Modèle AuditLog - Enregistrement complet des actions et accès
 * Conforme aux normes RGPD, ISO 27001, SOC2
 */

import {
  Table,
  Column,
  Model,
  PrimaryKey,
  Default,
  DataType,
  AllowNull,
  Index,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import UserModel from '../admin/users.model';

@Table({
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // Pas de mise à jour pour les logs d'audit
})
export class AuditLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  /**
   * ID de l'utilisateur (peut être null pour les actions anonymes)
   */
  @ForeignKey(() => UserModel)
  @AllowNull(true)
  @Index('idx_audit_logs_user_id')
  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  userId?: number;

  /**
   * Email de l'utilisateur (conservé pour traçabilité même si user supprimé)
   */
  @AllowNull(true)
  @Index('idx_audit_logs_email')
  @Column(DataType.STRING(100))
  email?: string;

  /**
   * Action effectuée (ex: login, user_created, access_denied)
   */
  @AllowNull(false)
  @Index('idx_audit_logs_action')
  @Column(DataType.STRING(50))
  action!: string;

  /**
   * Ressource concernée (ex: users, profiles, roles)
   */
  @AllowNull(true)
  @Index('idx_audit_logs_resource')
  @Column(DataType.STRING(50))
  resource?: string;

  /**
   * ID de la ressource concernée
   */
  @AllowNull(true)
  @Index('idx_audit_logs_resource_id')
  @Column({
    type: DataType.INTEGER,
    field: 'resource_id',
  })
  resourceId?: number;

  /**
   * Adresse IP hashée (conformité RGPD)
   */
  @AllowNull(true)
  @Column({
    type: DataType.STRING(100),
    field: 'ip_address',
  })
  ipAddress?: string;

  /**
   * User Agent du navigateur
   */
  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    field: 'user_agent',
  })
  userAgent?: string;

  /**
   * Niveau de gravité (info, warning, error, critical)
   */
  @AllowNull(false)
  @Index('idx_audit_logs_severity')
  @Column({
    type: DataType.ENUM('info', 'warning', 'error', 'critical'),
    defaultValue: 'info',
  })
  severity!: 'info' | 'warning' | 'error' | 'critical';

  /**
   * Succès ou échec de l'action
   */
  @AllowNull(false)
  @Index('idx_audit_logs_success')
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  success!: boolean;

  /**
   * Message d'erreur (si échec)
   */
  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    field: 'error_message',
  })
  errorMessage?: string;

  /**
   * Détails additionnels en JSON (permissions, changements, etc.)
   */
  @AllowNull(true)
  @Column(DataType.JSONB)
  details?: Record<string, any>;

  /**
   * Métadonnées (conservées pour compatibilité)
   */
  @AllowNull(true)
  @Column(DataType.JSONB)
  metadata?: Record<string, any>;

  // Timestamp
  declare createdAt: Date;

  // Relations
  @BelongsTo(() => UserModel)
  user?: UserModel;
}

export default AuditLog;