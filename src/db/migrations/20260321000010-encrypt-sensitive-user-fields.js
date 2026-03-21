'use strict';

const crypto = require('crypto');
require('dotenv').config();

const ENCRYPTION_VERSION = 'v1';
const IV_LENGTH = 12;

function deriveKey(material) {
  return crypto.createHash('sha256').update(material || '', 'utf8').digest();
}

function resolveEncryptionKey() {
  if (process.env.DATA_ENCRYPTION_KEY) {
    return deriveKey(process.env.DATA_ENCRYPTION_KEY);
  }

  return deriveKey(`${process.env.JWT_SECRET}:${process.env.SESSION_SECRET}`);
}

function resolveHashKey() {
  if (process.env.DATA_HASH_KEY) {
    return deriveKey(process.env.DATA_HASH_KEY);
  }

  return deriveKey(
    `${process.env.JWT_REFRESH_SECRET}:${process.env.SESSION_SECRET}`
  );
}

const encryptionKey = resolveEncryptionKey();
const hashKey = resolveHashKey();

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function hashEmailForLookup(email) {
  return crypto
    .createHmac('sha256', hashKey)
    .update(normalizeEmail(email), 'utf8')
    .digest('hex');
}

function encryptField(plainText) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plainText), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

function decryptField(value) {
  if (value === null || value === undefined) {
    return value;
  }

  const serialized = String(value);
  if (!serialized.startsWith(`${ENCRYPTION_VERSION}:`)) {
    return serialized;
  }

  const [, ivB64, tagB64, ciphertextB64] = serialized.split(':');
  if (!ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error('Encrypted field format is invalid');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

function encryptNullable(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith(`${ENCRYPTION_VERSION}:`)) {
    return normalized;
  }

  return encryptField(normalized);
}

function decryptNullable(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  return decryptField(normalized);
}

function normalizeSalaryValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return String(numericValue);
}

function normalizeHireDateValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const parsedDate = new Date(normalized);
  if (Number.isNaN(parsedDate.getTime())) {
    return normalized;
  }

  return parsedDate.toISOString().split('T')[0];
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "email_hash" VARCHAR(64)
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ALTER COLUMN "email" TYPE TEXT
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ALTER COLUMN "phone" TYPE TEXT
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ALTER COLUMN "salary" TYPE TEXT
      USING "salary"::TEXT
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ALTER COLUMN "hire_date" TYPE TEXT
      USING "hire_date"::TEXT
    `);

    const [users] = await queryInterface.sequelize.query(`
      SELECT "id", "email", "phone", "salary", "hire_date"
      FROM "users"
    `);

    const seenHashes = new Map();
    for (const user of users) {
      const currentEmail = decryptField(user.email);
      const normalizedEmail = normalizeEmail(currentEmail);

      if (!normalizedEmail) {
        throw new Error(`User ${user.id} has an empty email and cannot be migrated`);
      }

      const emailHash = hashEmailForLookup(normalizedEmail);
      const previousId = seenHashes.get(emailHash);
      if (previousId && previousId !== user.id) {
        throw new Error(
          `Duplicate email detected during migration (user ${previousId} and ${user.id})`
        );
      }
      seenHashes.set(emailHash, user.id);

      const encryptedEmail = encryptField(normalizedEmail);
      const decryptedPhone = decryptNullable(user.phone);
      const decryptedSalary = decryptNullable(user.salary);
      const decryptedHireDate = decryptNullable(user.hire_date);

      await queryInterface.sequelize.query(
        `
          UPDATE "users"
          SET
            "email" = :email,
            "email_hash" = :emailHash,
            "phone" = :phone,
            "salary" = :salary,
            "hire_date" = :hireDate
          WHERE "id" = :id
        `,
        {
          replacements: {
            id: user.id,
            email: encryptedEmail,
            emailHash,
            phone: encryptNullable(decryptedPhone),
            salary: encryptNullable(normalizeSalaryValue(decryptedSalary)),
            hireDate: encryptNullable(normalizeHireDateValue(decryptedHireDate)),
          },
        }
      );
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ALTER COLUMN "email_hash" SET NOT NULL
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT IF EXISTS "users_email_key"
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "idx_users_email"
    `);

    await queryInterface.addIndex('users', ['email_hash'], {
      name: 'idx_users_email_hash',
      unique: true,
    });

    await queryInterface.changeColumn('users', 'email_hash', {
      type: Sequelize.STRING(64),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    const [users] = await queryInterface.sequelize.query(`
      SELECT "id", "email", "phone", "salary", "hire_date"
      FROM "users"
    `);

    for (const user of users) {
      const email = normalizeEmail(decryptField(user.email));
      const phone = decryptNullable(user.phone);
      const salary = normalizeSalaryValue(decryptNullable(user.salary));
      const hireDate = normalizeHireDateValue(decryptNullable(user.hire_date));

      await queryInterface.sequelize.query(
        `
          UPDATE "users"
          SET
            "email" = :email,
            "phone" = :phone,
            "salary" = :salary,
            "hire_date" = :hireDate
          WHERE "id" = :id
        `,
        {
          replacements: {
            id: user.id,
            email,
            phone,
            salary,
            hireDate,
          },
        }
      );
    }

    await queryInterface.removeIndex('users', 'idx_users_email_hash');
    await queryInterface.removeColumn('users', 'email_hash');

    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ALTER COLUMN "email" TYPE VARCHAR(100)
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ALTER COLUMN "phone" TYPE VARCHAR(20)
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ALTER COLUMN "salary" TYPE DECIMAL(10, 2)
      USING NULLIF("salary", '')::DECIMAL(10, 2)
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ALTER COLUMN "hire_date" TYPE DATE
      USING NULLIF("hire_date", '')::DATE
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "users_email_key" UNIQUE ("email")
    `);

    await queryInterface.addIndex('users', ['email'], {
      name: 'idx_users_email',
    });
  },
};
