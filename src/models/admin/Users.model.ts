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
import ProfileModel from './Profil.model';
import EmploymentStatus from './EmploymentStatus.model';

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true, // Soft delete
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
      isUrl: {
        msg: 'Profile photo must be a valid URL',
      },
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

  // Timestamps
  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt?: Date;

  // Relations
  @BelongsTo(() => ProfileModel)
  profile?: ProfileModel;

  @BelongsTo(() => EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  // Methods
  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.passwordHash);
  }

  // Hooks
  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(user: User) {
    if (user.changed('passwordHash')) {
      const salt = await bcrypt.genSalt(12);
      user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
    }
  }
}