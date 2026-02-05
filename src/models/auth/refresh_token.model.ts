import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  Index,
} from 'sequelize-typescript';
import UserModel from '../admin/users.model';

/**
 * Modèle pour stocker les Refresh Tokens JWT
 * 
 * Sécurité :
 * - Permet de révoquer des tokens spécifiques
 * - Stocke l'empreinte du token (hachée)
 * - Associé à un user_agent et IP pour détecter les vols
 * - Expiré automatiquement après JWT_REFRESH_EXPIRE
 */
@Table({
  tableName: 'refresh_tokens',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['token_hash'], unique: true },
    { fields: ['expires_at'] },
    { fields: ['is_revoked'] },
  ],
})
export class RefreshTokenModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  // Relation avec l'utilisateur
  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  user_id!: number;

  @BelongsTo(() => UserModel)
  user?: UserModel;

  // Hash du token (on ne stocke jamais le token en clair)
  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  token_hash!: string;

  // Métadonnées de sécurité
  @Column({
    type: DataType.STRING(80),
    allowNull: true,
    comment: 'IP address hachée (format: sha256:hash) pour détecter les vols de token',
  })
  ip_address?: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    comment: 'User-Agent du client pour détecter les changements',
  })
  user_agent?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    comment: 'Type d\'appareil (mobile, desktop, tablet)',
  })
  device_type?: string;

  // Gestion du cycle de vie
  @Column({
    type: DataType.DATE,
    allowNull: false,
    comment: 'Date d\'expiration du refresh token',
  })
  expires_at!: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Token révoqué manuellement (logout, changement password)',
  })
  is_revoked!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Date de révocation',
  })
  revoked_at?: Date;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    comment: 'Raison de la révocation (logout, security, password_change)',
  })
  revocation_reason?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Dernière utilisation du refresh token',
  })
  last_used_at?: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Nombre de fois que le token a été utilisé',
  })
  usage_count!: number;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  created_at!: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  updated_at!: Date;

  /**
   * Méthodes utilitaires
   */

  // Vérifier si le token est valide
  isValid(): boolean {
    if (this.is_revoked) return false;
    if (new Date() > this.expires_at) return false;
    return true;
  }

  // Révoquer le token
  async revoke(reason: string): Promise<void> {
    this.is_revoked = true;
    this.revoked_at = new Date();
    this.revocation_reason = reason;
    await this.save();
  }

  // Marquer comme utilisé
  async markAsUsed(): Promise<void> {
    this.last_used_at = new Date();
    this.usage_count += 1;
    await this.save();
  }
}

export default RefreshTokenModel;
