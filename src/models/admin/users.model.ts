import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Unique,
  AllowNull,
  ForeignKey,
  BelongsTo,
  Index,
  BeforeCreate,
  BeforeUpdate,
  BelongsToMany,
} from 'sequelize-typescript';
import bcrypt from 'bcrypt';
import ProfileModel from './profil.model';
import EmploymentStatus from './employment_status.model';
import PermissionModel from '../permission/permission.model';
import UserPermission from '../permission/user_permission.model';
import {
  decryptField,
  decryptNullableField,
  encryptField,
  encryptNullableField,
  hashEmailForLookup,
  normalizeEmail,
} from '../../utils/field_encryption';

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
})
export default class UserModel extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(64),
    field: 'email_hash',
  })
  emailHash!: string;

  @AllowNull(false)
  @Column({
    type: DataType.TEXT,
    get(this: UserModel): string {
      const encryptedValue = this.getDataValue('email');
      return decryptField(encryptedValue);
    },
    set(this: UserModel, value: string) {
      const normalized = normalizeEmail(value ?? '');
      if (!normalized) {
        throw new Error('Email cannot be empty');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalized)) {
        throw new Error('Must be a valid email address');
      }

      this.setDataValue('email', encryptField(normalized));
      this.setDataValue('emailHash', hashEmailForLookup(normalized));
    },
  })
  email!: string;

  @Unique
  @AllowNull(false)
  @Index('idx_users_username')
  @Column({
    type: DataType.STRING(100),
    validate: {
      len: {
        args: [2, 100],
        msg: 'Username must be between 2 and 100 characters',
      },
      notEmpty: {
        msg: 'Username cannot be empty',
      },
      // Valider le format : lettres, chiffres, tirets et underscores seulement
      is: {
        args: /^[a-zA-Z0-9_-]+$/,
        msg: 'Username can only contain letters, numbers, hyphens and underscores',
      },
    },
  })
  username!: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(255),
    field: 'password_hash',
  })
  passwordHash!: string;

  @AllowNull(false)
  @Index('idx_users_last_name')
  @Column({
    type: DataType.STRING(50),
    field: 'last_name',
    validate: {
      len: {
        args: [2, 50],
        msg: 'Last name must be between 2 and 50 characters',
      },
      notEmpty: {
        msg: 'Last name cannot be empty',
      },
    },
  })
  lastName!: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(50),
    field: 'first_name',
    validate: {
      len: {
        args: [2, 50],
        msg: 'First name must be between 2 and 50 characters',
      },
      notEmpty: {
        msg: 'First name cannot be empty',
      },
    },
  })
  firstName!: string;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    field: 'phone',
    get(this: UserModel): string | null {
      const encryptedValue = this.getDataValue('phone');
      return decryptNullableField(encryptedValue);
    },
    set(this: UserModel, value: string | null | undefined) {
      const normalized = value?.trim() ?? null;
      this.setDataValue('phone', encryptNullableField(normalized));
    },
  })
  phone?: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.STRING(254),
    field: 'profile_photo',
    validate: {
      isValidPhotoUrl(value: string) {
        if (!value || value.trim() === '') {
          return;
        }

        const trimmedValue = value.trim();

        if (trimmedValue.startsWith('/')) {
          if (trimmedValue.includes('..') || trimmedValue.includes('\\')) {
            throw new Error('Profile photo path contains invalid characters');
          }
          return;
        }

        try {
          const url = new URL(trimmedValue);
          
          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('Profile photo URL must use HTTP or HTTPS protocol');
          }

          return;
        } catch {
          throw new Error('Profile photo must be a valid URL or relative path');
        }
      }
    },
  })
  profilePhoto?: string;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    field: 'salary',
    get(this: UserModel): number | null {
      const encryptedValue = this.getDataValue('salary');
      const decrypted = decryptNullableField(encryptedValue);

      if (decrypted === null) {
        return null;
      }

      const parsed = Number(decrypted);
      return Number.isFinite(parsed) ? parsed : null;
    },
    set(this: UserModel, value: number | string | null | undefined) {
      if (value === null || value === undefined || value === '') {
        this.setDataValue('salary', null);
        return;
      }

      const numericValue = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(numericValue) || numericValue < 0) {
        throw new Error('Salary must be positive');
      }

      this.setDataValue('salary', encryptField(String(numericValue)));
    },
  })
  salary?: number | null;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    field: 'hire_date',
    get(this: UserModel): string | null {
      const encryptedValue = this.getDataValue('hireDate');
      const decrypted = decryptNullableField(encryptedValue);

      if (!decrypted) {
        return null;
      }

      const date = new Date(decrypted);
      if (Number.isNaN(date.getTime())) {
        return decrypted;
      }

      return date.toISOString().split('T')[0];
    },
    set(this: UserModel, value: string | Date | null | undefined) {
      if (value === null || value === undefined || value === '') {
        this.setDataValue('hireDate', null);
        return;
      }

      const normalized =
        value instanceof Date
          ? value.toISOString().split('T')[0]
          : String(value).trim();

      this.setDataValue('hireDate', encryptField(normalized));
    },
  })
  hireDate?: string | null;

  @AllowNull(false)
  @Column({
    type: DataType.BOOLEAN,
    field: 'is_active',
    defaultValue: true,
  })
  isActive!: boolean;

  @ForeignKey(() => EmploymentStatus)
  @AllowNull(true)
  @Index('idx_users_employment_status_id')
  @Column({
    type: DataType.INTEGER,
    field: 'employment_status_id',
  })
  employment_status_id?: number;

  @ForeignKey(() => ProfileModel)
  @AllowNull(true)
  @Index('idx_users_profile_id')
  @Column({
    type: DataType.INTEGER,
    field: 'profile_id',
  })
  profile_id?: number;

  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt?: Date;

  @BelongsTo(() => ProfileModel)
  profile?: ProfileModel;

  @BelongsTo(() => EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  @BelongsToMany(() => PermissionModel, () => UserPermission, 'userId', 'permissionId')
  directPermissions?: PermissionModel[];

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.passwordHash);
  }

  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(user: UserModel) {
    if (user.changed('passwordHash')) {
      const salt = await bcrypt.genSalt(12);
      user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
    }
  }
}
