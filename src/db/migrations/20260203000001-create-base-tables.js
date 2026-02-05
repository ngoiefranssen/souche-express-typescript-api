/**
 * Migration: Création des tables de base du système
 * 
 * Crée les tables fondamentales nécessaires au fonctionnement de l'application :
 * - employment_statuses : Statuts d'emploi
 * - profiles : Profils utilisateur
 * - roles : Rôles du système
 * - users : Utilisateurs
 * - user_sessions : Sessions utilisateur
 * - profile_roles : Liaison profiles-roles
 * - audit_logs : Logs d'audit (si elle n'existe pas)
 * 
 * @date 2026-02-02
 */

'use strict';

module.exports = {
  /**
   * Création de toutes les tables de base
   */
  async up(queryInterface, Sequelize) {
    // 1. Table employment_statuses
    await queryInterface.createTable('employment_statuses', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      label: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
    });

    // 2. Table profiles
    await queryInterface.createTable('profiles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      label: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // 3. Table roles
    await queryInterface.createTable('roles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      label: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
    console.log('✅ Table "roles" créée');

    // 4. Table users
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      username: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      last_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      first_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      profile_photo: {
        type: Sequelize.STRING(254),
        allowNull: true,
      },
      salary: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      hire_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      employment_status_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'employment_statuses',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      profile_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'profiles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Indexes pour users (avec gestion des doublons)
    const userIndexes = [
      { name: 'idx_users_email', columns: ['email'] },
      { name: 'idx_users_username', columns: ['username'] },
      { name: 'idx_users_last_name', columns: ['last_name'] },
      { name: 'idx_users_employment_status_id', columns: ['employment_status_id'] },
      { name: 'idx_users_profile_id', columns: ['profile_id'] },
    ];

    for (const index of userIndexes) {
      try {
        await queryInterface.addIndex('users', index.columns, { name: index.name });
      } catch (error) {
        console.log(`  ↻ Index ${index.name} existe déjà, ignoré`);
      }
    }
    console.log('✅ Table "users" créée');

    // 5. Table profile_roles (liaison many-to-many)
    await queryInterface.createTable('profile_roles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      profile_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'profiles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Index unique composite
    await queryInterface.addIndex('profile_roles', ['profile_id', 'role_id'], {
      name: 'unique_profile_role',
      unique: true,
    });

    await queryInterface.addIndex('profile_roles', ['profile_id'], {
      name: 'idx_profile_roles_profile_id',
    });

    await queryInterface.addIndex('profile_roles', ['role_id'], {
      name: 'idx_profile_roles_role_id',
    });

    console.log('✅ Table "profile_roles" créée');

    // 6. Table user_sessions
    await queryInterface.createTable('user_sessions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      token: {
        type: Sequelize.STRING(500),
        allowNull: false,
        unique: true,
      },
      last_activity: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    const sessionIndexes = [
      { name: 'idx_user_sessions_user_id', columns: ['user_id'] },
      { name: 'idx_user_sessions_token', columns: ['token'] },
    ];

    for (const index of sessionIndexes) {
      try {
        await queryInterface.addIndex('user_sessions', index.columns, { name: index.name });
      } catch (error) {
        console.log(`  ↻ Index ${index.name} existe déjà, ignoré`);
      }
    }
    console.log('✅ Table "user_sessions" créée');

    // 7. Table audit_logs (si elle n'existe pas)
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('audit_logs')) {
      await queryInterface.createTable('audit_logs', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        email: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        action: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        ipHash: {
          type: Sequelize.STRING(100),
          allowNull: true,
          field: 'ip_hash',
        },
        userAgent: {
          type: Sequelize.TEXT,
          allowNull: true,
          field: 'user_agent',
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'created_at',
        },
      });
      console.log('✅ Table "audit_logs" créée');
    } else {
      console.log('↻ Table "audit_logs" existe déjà');
    }

    console.log('\n✅ Toutes les tables de base ont été créées avec succès !');
  },

  /**
   * Suppression de toutes les tables de base
   */
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_sessions');
    await queryInterface.dropTable('profile_roles');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('roles');
    await queryInterface.dropTable('profiles');
    await queryInterface.dropTable('employment_statuses');
    
    const tables = await queryInterface.showAllTables();
    if (tables.includes('audit_logs')) {
      await queryInterface.dropTable('audit_logs');
    }

    console.log('✅ Toutes les tables de base ont été supprimées');
  },
};
