/**
 * 
 */

import {
  Table,
  Column,
  Model,
  PrimaryKey,
  Default,
  DataType,
  AllowNull,
  Index
} from 'sequelize-typescript';

@Table({ tableName: 'audit_logs', timestamps: true, updatedAt: false })

export class AuditLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Index
  @Column
  email!: string;

  @AllowNull(false)
  @Column
  action!: string;

  @AllowNull(false)
  @Column
  ipHash!: string;

  @AllowNull(true)
  @Column
  userAgent?: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  metadata?: object;
}

export default AuditLog