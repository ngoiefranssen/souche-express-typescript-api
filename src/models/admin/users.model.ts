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
} from 'sequelize-typescript';
import bcrypt from 'bcrypt';
import ProfileModel from './profil.model';
import EmploymentStatus from './employment_status.model';

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
})
export default class User extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Unique
  @AllowNull(false)
  @Index('idx_users_email')
  @Column({
    type: DataType.STRING(100),
    validate: {
      isEmail: {
        msg: 'Must be a valid email address',
      },
      notEmpty: {
        msg: 'Email cannot be empty',
      },
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
    type: DataType.STRING(20),
    field: 'phone',
    validate: {
      len: {
        args: [0, 20],
        msg: 'Phone cannot exceed 20 characters',
      },
    },
  })
  phone?: string;

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
    type: DataType.DECIMAL(10, 2),
    field: 'salary',
    validate: {
      min: {
        args: [0],
        msg: 'Salary must be positive',
      },
    },
  })
  salary?: number;

  @AllowNull(true)
  @Column({
    type: DataType.DATEONLY,
    field: 'hire_date',
  })
  hireDate?: Date;

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

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.passwordHash);
  }

  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(user: User) {
    if (user.changed('passwordHash')) {
      const salt = await bcrypt.genSalt(12);
      user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
    }
  }
}