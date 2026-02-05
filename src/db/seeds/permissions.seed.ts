/**
 * Script de seed pour initialiser les permissions système
 * Exécuter avec: ts-node src/db/seeds/permissions.seed.ts
 */

import { sequelize } from '../sequelize';
import PermissionModel from '../../models/permission/permission.model';
import RoleModel from '../../models/admin/role.model';
import RolePermission from '../../models/permission/role_permission.model';
import { SYSTEM_PERMISSIONS } from '../../types/permissions';

/**
 * Définition des permissions système
 */
const systemPermissions = [
  // Gestion des utilisateurs
  {
    name: 'users:read',
    resource: 'users',
    action: 'read' as const,
    description: 'Consulter les utilisateurs',
    category: 'USER_MANAGEMENT',
    priority: 50,
    isSystem: true,
  },
  {
    name: 'users:create',
    resource: 'users',
    action: 'create' as const,
    description: 'Créer des utilisateurs',
    category: 'USER_MANAGEMENT',
    priority: 60,
    isSystem: true,
  },
  {
    name: 'users:update',
    resource: 'users',
    action: 'update' as const,
    description: 'Modifier des utilisateurs',
    category: 'USER_MANAGEMENT',
    priority: 60,
    isSystem: true,
  },
  {
    name: 'users:delete',
    resource: 'users',
    action: 'delete' as const,
    description: 'Supprimer des utilisateurs',
    category: 'USER_MANAGEMENT',
    priority: 70,
    isSystem: true,
  },
  {
    name: 'users:*',
    resource: 'users',
    action: '*' as const,
    description: 'Toutes les actions sur les utilisateurs',
    category: 'USER_MANAGEMENT',
    priority: 100,
    isSystem: true,
  },

  // Gestion des profils
  {
    name: 'profiles:read',
    resource: 'profiles',
    action: 'read' as const,
    description: 'Consulter les profils',
    category: 'PROFILE_MANAGEMENT',
    priority: 50,
    isSystem: true,
  },
  {
    name: 'profiles:create',
    resource: 'profiles',
    action: 'create' as const,
    description: 'Créer des profils',
    category: 'PROFILE_MANAGEMENT',
    priority: 60,
    isSystem: true,
  },
  {
    name: 'profiles:update',
    resource: 'profiles',
    action: 'update' as const,
    description: 'Modifier des profils',
    category: 'PROFILE_MANAGEMENT',
    priority: 60,
    isSystem: true,
  },
  {
    name: 'profiles:delete',
    resource: 'profiles',
    action: 'delete' as const,
    description: 'Supprimer des profils',
    category: 'PROFILE_MANAGEMENT',
    priority: 70,
    isSystem: true,
  },
  {
    name: 'profiles:*',
    resource: 'profiles',
    action: '*' as const,
    description: 'Toutes les actions sur les profils',
    category: 'PROFILE_MANAGEMENT',
    priority: 100,
    isSystem: true,
  },

  // Gestion des rôles
  {
    name: 'roles:read',
    resource: 'roles',
    action: 'read' as const,
    description: 'Consulter les rôles',
    category: 'ROLE_MANAGEMENT',
    priority: 50,
    isSystem: true,
  },
  {
    name: 'roles:create',
    resource: 'roles',
    action: 'create' as const,
    description: 'Créer des rôles',
    category: 'ROLE_MANAGEMENT',
    priority: 80,
    isSystem: true,
  },
  {
    name: 'roles:update',
    resource: 'roles',
    action: 'update' as const,
    description: 'Modifier des rôles',
    category: 'ROLE_MANAGEMENT',
    priority: 80,
    isSystem: true,
  },
  {
    name: 'roles:delete',
    resource: 'roles',
    action: 'delete' as const,
    description: 'Supprimer des rôles',
    category: 'ROLE_MANAGEMENT',
    priority: 90,
    isSystem: true,
  },
  {
    name: 'roles:*',
    resource: 'roles',
    action: '*' as const,
    description: 'Toutes les actions sur les rôles',
    category: 'ROLE_MANAGEMENT',
    priority: 100,
    isSystem: true,
  },

  // Gestion des permissions
  {
    name: 'permissions:read',
    resource: 'permissions',
    action: 'read' as const,
    description: 'Consulter les permissions',
    category: 'PERMISSION_MANAGEMENT',
    priority: 50,
    isSystem: true,
  },
  {
    name: 'permissions:create',
    resource: 'permissions',
    action: 'create' as const,
    description: 'Créer des permissions',
    category: 'PERMISSION_MANAGEMENT',
    priority: 90,
    isSystem: true,
  },
  {
    name: 'permissions:update',
    resource: 'permissions',
    action: 'update' as const,
    description: 'Modifier des permissions',
    category: 'PERMISSION_MANAGEMENT',
    priority: 90,
    isSystem: true,
  },
  {
    name: 'permissions:delete',
    resource: 'permissions',
    action: 'delete' as const,
    description: 'Supprimer des permissions',
    category: 'PERMISSION_MANAGEMENT',
    priority: 95,
    isSystem: true,
  },
  {
    name: 'permissions:manage',
    resource: 'permissions',
    action: 'manage' as const,
    description: 'Gérer les permissions (assigner/révoquer)',
    category: 'PERMISSION_MANAGEMENT',
    priority: 95,
    isSystem: true,
  },
  {
    name: 'permissions:*',
    resource: 'permissions',
    action: '*' as const,
    description: 'Toutes les actions sur les permissions',
    category: 'PERMISSION_MANAGEMENT',
    priority: 100,
    isSystem: true,
  },

  // Audit
  {
    name: 'audit:read',
    resource: 'audit',
    action: 'read' as const,
    description: 'Consulter les logs d\'audit',
    category: 'AUDIT',
    priority: 70,
    isSystem: true,
  },
  {
    name: 'audit:*',
    resource: 'audit',
    action: '*' as const,
    description: 'Toutes les actions sur l\'audit',
    category: 'AUDIT',
    priority: 100,
    isSystem: true,
  },

  // Statuts d'emploi
  {
    name: 'employment_status:read',
    resource: 'employment_status',
    action: 'read' as const,
    description: 'Consulter les statuts d\'emploi',
    category: 'EMPLOYMENT',
    priority: 40,
    isSystem: true,
  },
  {
    name: 'employment_status:create',
    resource: 'employment_status',
    action: 'create' as const,
    description: 'Créer des statuts d\'emploi',
    category: 'EMPLOYMENT',
    priority: 60,
    isSystem: true,
  },
  {
    name: 'employment_status:update',
    resource: 'employment_status',
    action: 'update' as const,
    description: 'Modifier des statuts d\'emploi',
    category: 'EMPLOYMENT',
    priority: 60,
    isSystem: true,
  },
  {
    name: 'employment_status:delete',
    resource: 'employment_status',
    action: 'delete' as const,
    description: 'Supprimer des statuts d\'emploi',
    category: 'EMPLOYMENT',
    priority: 70,
    isSystem: true,
  },
  {
    name: 'employment_status:*',
    resource: 'employment_status',
    action: '*' as const,
    description: 'Toutes les actions sur les statuts d\'emploi',
    category: 'EMPLOYMENT',
    priority: 100,
    isSystem: true,
  },

  // Sessions
  {
    name: 'sessions:read',
    resource: 'sessions',
    action: 'read' as const,
    description: 'Consulter les sessions',
    category: 'SYSTEM',
    priority: 60,
    isSystem: true,
  },
  {
    name: 'sessions:delete',
    resource: 'sessions',
    action: 'delete' as const,
    description: 'Supprimer des sessions',
    category: 'SYSTEM',
    priority: 80,
    isSystem: true,
  },
  {
    name: 'sessions:*',
    resource: 'sessions',
    action: '*' as const,
    description: 'Toutes les actions sur les sessions',
    category: 'SYSTEM',
    priority: 100,
    isSystem: true,
  },

  // Système
  {
    name: 'system:manage',
    resource: 'system',
    action: 'manage' as const,
    description: 'Gérer le système',
    category: 'SYSTEM',
    priority: 100,
    isSystem: true,
  },
  {
    name: 'system:*',
    resource: 'system',
    action: '*' as const,
    description: 'Accès super administrateur total',
    category: 'SYSTEM',
    priority: 100,
    isSystem: true,
  },
];

/**
 * Seed les permissions
 */
async function seedPermissions() {
  try {

    await sequelize.authenticate();

    // Créer ou mettre à jour les permissions
    for (const permData of systemPermissions) {
      const [permission, created] = await PermissionModel.findOrCreate({
        where: { name: permData.name },
        defaults: permData,
      });

      if (!created) {
        await permission.update(permData);
        console.log(`Mise à jour: ${permData.name}`);
      } else {
        console.log(`Créée: ${permData.name}`);
      }
    }

    // Vérifier et créer les rôles s'ils n'existent pas
    const roles = [
      { label: 'Super Admin', description: 'Accès complet au système' },
      { label: 'Admin', description: 'Administrateur avec accès étendu' },
      { label: 'Manager', description: 'Gestionnaire avec accès modéré' },
      { label: 'User', description: 'Utilisateur standard' },
    ];

    for (const roleData of roles) {
      const [, created] = await RoleModel.findOrCreate({
        where: { label: roleData.label },
        defaults: roleData,
      });

      if (created) {
        console.log(`Rôle créé: ${roleData.label}`);
      } else {
        console.log(`Rôle existant: ${roleData.label}`);
      }
    }

    // Super Admin - Toutes les permissions
    const superAdminRole = await RoleModel.findOne({ where: { label: 'Super Admin' } });
    if (superAdminRole) {
      const systemAllPermission = await PermissionModel.findOne({ where: { name: 'system:*' } });
      if (systemAllPermission) {
        await RolePermission.findOrCreate({
          where: {
            roleId: superAdminRole.id,
            permissionId: systemAllPermission.id,
          },
          defaults: {
            roleId: superAdminRole.id,
            permissionId: systemAllPermission.id,
            isActive: true,
          },
        });
        console.log('   ✓ Super Admin: system:* assigné');
      }
    }

    // Admin - Permissions d'administration
    const adminRole = await RoleModel.findOne({ where: { label: 'Admin' } });
    if (adminRole) {
      const adminPermissions = SYSTEM_PERMISSIONS.ADMIN;
      for (const permName of adminPermissions) {
        const perm = await PermissionModel.findOne({ where: { name: permName } });
        if (perm) {
          await RolePermission.findOrCreate({
            where: {
              roleId: adminRole.id,
              permissionId: perm.id,
            },
            defaults: {
              roleId: adminRole.id,
              permissionId: perm.id,
              isActive: true,
            },
          });
        }
      }
    }

    // Manager - Permissions de gestion
    const managerRole = await RoleModel.findOne({ where: { label: 'Manager' } });
    if (managerRole) {
      const managerPermissions = SYSTEM_PERMISSIONS.MANAGER;
      for (const permName of managerPermissions) {
        const perm = await PermissionModel.findOne({ where: { name: permName } });
        if (perm) {
          await RolePermission.findOrCreate({
            where: {
              roleId: managerRole.id,
              permissionId: perm.id,
            },
            defaults: {
              roleId: managerRole.id,
              permissionId: perm.id,
              isActive: true,
            },
          });
        }
      }
    }

    // User - Permissions de base
    const userRole = await RoleModel.findOne({ where: { label: 'User' } });
    if (userRole) {
      const userPermissions = SYSTEM_PERMISSIONS.USER;
      for (const permName of userPermissions) {
        const perm = await PermissionModel.findOne({ where: { name: permName } });
        if (perm) {
          await RolePermission.findOrCreate({
            where: {
              roleId: userRole.id,
              permissionId: perm.id,
            },
            defaults: {
              roleId: userRole.id,
              permissionId: perm.id,
              isActive: true,
            },
          });
        }
      }
    }

    process.exit(0);
  } catch (_error: unknown) {
    process.exit(-1);
  }
}

// Exécuter le seed
seedPermissions();
