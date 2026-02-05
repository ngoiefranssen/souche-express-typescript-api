/**
 * Types pour le système de permissions RBAC + ABAC
 */

// Actions possibles sur les ressources
export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | '*' | 'execute' | 'manage';

// Format des permissions
export type PermissionString = `${string}:${PermissionAction}`;

// Ressources système
export type SystemResource =
  | 'users'
  | 'profiles'
  | 'roles'
  | 'permissions'
  | 'audit'
  | 'employment_status'
  | 'sessions'
  | 'system';

// Opérateurs pour les conditions ABAC
export type ABACOperator = 
  | 'eq'      // égal à
  | 'ne'      // différent de
  | 'gt'      // supérieur à
  | 'gte'     // supérieur ou égal à
  | 'lt'      // inférieur à
  | 'lte'     // inférieur ou égal à
  | 'in'      // dans la liste
  | 'nin'     // pas dans la liste
  | 'contains'// contient
  | 'startsWith' // commence par
  | 'endsWith';  // se termine par

// Conditions ABAC
export interface ABACCondition {
  [attribute: string]: any | {
    [operator in ABACOperator]?: any;
  };
}

// Contexte utilisateur pour ABAC
export interface UserContext {
  userId: number;
  email: string;
  profileId?: number;
  roles: string[];
  permissions: string[];
  attributes?: {
    department?: string;
    region?: string;
    clearanceLevel?: number;
    team?: string;
    employmentStatus?: string;
    [key: string]: any;
  };
}

// Résultat de vérification de permission
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  matchedPermission?: string;
  matchedRole?: string;
}

// Options pour vérifier les permissions
export interface CheckPermissionOptions {
  requireAll?: boolean; // true = AND, false = OR (défaut)
  context?: Record<string, any>; // Contexte additionnel pour ABAC
  strict?: boolean; // Mode strict : refuse si aucune permission explicite
}

// Structure d'une permission complète
export interface Permission {
  id: number;
  name: string;
  resource: string;
  action: PermissionAction;
  description?: string;
  category?: string;
  priority: number;
  isSystem: boolean;
  conditions?: ABACCondition;
  createdAt: Date;
  updatedAt: Date;
}

// Structure d'un rôle avec permissions
export interface RoleWithPermissions {
  id: number;
  label: string;
  description?: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

// Permissions pré-définies pour les rôles système
export const SYSTEM_PERMISSIONS = {
  // Super Admin - accès total
  SUPER_ADMIN: [
    'system:*',
    'users:*',
    'profiles:*',
    'roles:*',
    'permissions:*',
    'audit:*',
    'employment_status:*',
    'sessions:*',
  ],
  
  // Admin - gestion utilisateurs et profils
  ADMIN: [
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'profiles:read',
    'profiles:create',
    'profiles:update',
    'roles:read',
    'audit:read',
    'employment_status:read',
    'sessions:read',
  ],
  
  // Manager - lecture et modification limitée
  MANAGER: [
    'users:read',
    'users:update',
    'profiles:read',
    'roles:read',
    'audit:read',
    'employment_status:read',
  ],
  
  // User - lecture seule
  USER: [
    'users:read',
    'profiles:read',
  ],
  
  // Guest - lecture très limitée
  GUEST: [
    'profiles:read',
  ],
} as const;

// Permissions par catégorie (pour l'interface frontend)
export const PERMISSION_CATEGORIES = {
  USER_MANAGEMENT: 'Gestion des utilisateurs',
  PROFILE_MANAGEMENT: 'Gestion des profils',
  ROLE_MANAGEMENT: 'Gestion des rôles',
  PERMISSION_MANAGEMENT: 'Gestion des permissions',
  AUDIT: 'Audit et logs',
  SYSTEM: 'Système',
  EMPLOYMENT: 'Gestion RH',
} as const;

export type PermissionCategory = keyof typeof PERMISSION_CATEGORIES;
