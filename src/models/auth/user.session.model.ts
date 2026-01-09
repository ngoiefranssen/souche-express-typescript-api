import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import User from '../admin/users.model';

@Table({
  tableName: 'user_sessions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export default class UserSessionModel extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @ForeignKey(() => User)
  @Index('idx_user_sessions_user_id')
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'user_id',
  })
  userId!: number;

  @Index('idx_user_sessions_token')
  @Column({
    type: DataType.STRING(500),
    allowNull: false,
    unique: true,
  })
  token!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'last_activity',
  })
  lastActivity!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'expires_at',
  })
  expiresAt!: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
  })
  isActive!: boolean;

  @Column({
    type: DataType.STRING(45),
    allowNull: true,
    field: 'ip_address',
  })
  ipAddress?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: 'user_agent',
  })
  userAgent?: string;

  // Relations
  @BelongsTo(() => User)
  user?: User;

  // Timestamps
  declare createdAt: Date;
  declare updatedAt: Date;
}