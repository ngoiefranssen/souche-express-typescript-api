import {
  UserContext,
  PermissionCheckResult,
  CheckPermissionOptions,
  ABACCondition,
  ABACOperator,
} from '../types/permissions';

/**
 * Classe utilitaire pour vérifier les permissions RBAC + ABAC
 */
export class PermissionChecker {
  /**
   * Vérifie si l'utilisateur a une ou plusieurs permissions
   * @param userContext Contexte utilisateur avec rôles et permissions
   * @param requiredPermissions Permission(s) requise(s) (string ou tableau)
   * @param options Options de vérification
   * @returns Résultat de la vérification
   */
  static check(
    userContext: UserContext,
    requiredPermissions: string | string[],
    options: CheckPermissionOptions = {}
  ): PermissionCheckResult {
    const { requireAll = false, context = {} as Record<string, any>} = options;

    // Normaliser en tableau
    const permissions = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    // Si l'utilisateur n'a aucune permission
    if (!userContext.permissions || userContext.permissions.length === 0) {
      return {
        allowed: false,
        reason: 'Aucune permission attribuée à cet utilisateur',
      };
    }

    // Vérifier chaque permission requise
    const results = permissions.map((required) =>
      this.checkSinglePermission(userContext, required, context)
    );

    // Mode AND : toutes les permissions doivent être présentes
    if (requireAll) {
      const allAllowed = results.every((r) => r.allowed);
      return {
        allowed: allAllowed,
        reason: allAllowed
          ? 'Toutes les permissions requises sont présentes'
          : 'Certaines permissions requises sont manquantes',
        matchedPermission: allAllowed ? results[0]?.matchedPermission : undefined,
      };
    }

    // Mode OR : au moins une permission doit être présente
    const someAllowed = results.some((r) => r.allowed);
    const matchedResult = results.find((r) => r.allowed);

    return {
      allowed: someAllowed,
      reason: someAllowed
        ? 'Au moins une permission requise est présente'
        : 'Aucune des permissions requises n\'est présente',
      matchedPermission: matchedResult?.matchedPermission,
      matchedRole: matchedResult?.matchedRole,
    };
  }

  /**
   * Vérifie une seule permission avec support wildcard
   * @param userContext Contexte utilisateur
   * @param requiredPermission Permission requise (ex: "users:read")
   * @param context Contexte additionnel pour ABAC
   * @returns Résultat de la vérification
   */
  private static checkSinglePermission(
    userContext: UserContext,
    requiredPermission: string,
    _context: Record<string, any>
  ): PermissionCheckResult {
    // Vérifier permission exacte
    if (userContext.permissions.includes(requiredPermission)) {
      return {
        allowed: true,
        matchedPermission: requiredPermission,
        reason: 'Permission exacte trouvée',
      };
    }

    // Vérifier wildcard resource:*
    const [resource] = requiredPermission.split(':');
    const wildcardPermission = `${resource}:*`;

    if (userContext.permissions.includes(wildcardPermission)) {
      return {
        allowed: true,
        matchedPermission: wildcardPermission,
        reason: 'Permission wildcard trouvée',
      };
    }

    // Vérifier super admin (system:*)
    if (userContext.permissions.includes('system:*')) {
      return {
        allowed: true,
        matchedPermission: 'system:*',
        reason: 'Accès super admin',
      };
    }

    return {
      allowed: false,
      reason: `Permission "${requiredPermission}" non trouvée`,
    };
  }

  /**
   * Vérifie les conditions ABAC
   * @param conditions Conditions définies dans la permission
   * @param userContext Contexte utilisateur
   * @param additionalContext Contexte additionnel
   * @returns true si les conditions sont satisfaites
   */
  static checkABACConditions(
    conditions: ABACCondition,
    userContext: UserContext,
    additionalContext: Record<string, any> = {}
  ): boolean {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true; // Pas de conditions = autorisé
    }

    const fullContext: Record<string, any> = {
      ...userContext.attributes,
      ...additionalContext,
      userId: userContext.userId,
      email: userContext.email,
    };

    // Vérifier chaque condition
    for (const [attribute, condition] of Object.entries(conditions)) {
      const contextValue = fullContext[attribute];

      // Si l'attribut n'existe pas dans le contexte
      if (contextValue === undefined) {
        return false;
      }

      // Vérification simple (égalité directe)
      if (typeof condition !== 'object' || condition === null) {
        if (contextValue !== condition) {
          return false;
        }
        continue;
      }

      // Vérification avec opérateurs
      for (const [operator, expectedValue] of Object.entries(condition)) {
        if (!this.evaluateOperator(operator as ABACOperator, contextValue, expectedValue)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Évalue un opérateur ABAC
   */
  private static evaluateOperator(
    operator: ABACOperator,
    actualValue: any,
    expectedValue: any
  ): boolean {
    switch (operator) {
      case 'eq':
        return actualValue === expectedValue;
      case 'ne':
        return actualValue !== expectedValue;
      case 'gt':
        return actualValue > expectedValue;
      case 'gte':
        return actualValue >= expectedValue;
      case 'lt':
        return actualValue < expectedValue;
      case 'lte':
        return actualValue <= expectedValue;
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
      case 'nin':
        return Array.isArray(expectedValue) && !expectedValue.includes(actualValue);
      case 'contains':
        return typeof actualValue === 'string' && actualValue.includes(expectedValue);
      case 'startsWith':
        return typeof actualValue === 'string' && actualValue.startsWith(expectedValue);
      case 'endsWith':
        return typeof actualValue === 'string' && actualValue.endsWith(expectedValue);
      default:
        return false;
    }
  }

  /**
   * Extrait les permissions d'une liste de rôles
   * @param roles Liste des rôles avec leurs permissions
   * @returns Liste unique de permissions
   */
  static extractPermissions(roles: Array<{ permissions?: Array<{ name: string }> }>): string[] {
    const permissions = new Set<string>();

    for (const role of roles) {
      if (role.permissions) {
        for (const permission of role.permissions) {
          permissions.add(permission.name);
        }
      }
    }

    return Array.from(permissions);
  }

  /**
   * Vérifie si l'utilisateur est propriétaire de la ressource
   * @param userContext Contexte utilisateur
   * @param resourceOwnerId ID du propriétaire de la ressource
   * @returns true si l'utilisateur est le propriétaire
   */
  static isResourceOwner(userContext: UserContext, resourceOwnerId: number): boolean {
    return userContext.userId === resourceOwnerId;
  }

  /**
   * Vérifie si l'utilisateur a un rôle spécifique
   * @param userContext Contexte utilisateur
   * @param roleName Nom du rôle
   * @returns true si l'utilisateur a ce rôle
   */
  static hasRole(userContext: UserContext, roleName: string): boolean {
    return userContext.roles.includes(roleName);
  }

  /**
   * Vérifie si l'utilisateur a au moins un des rôles spécifiés
   * @param userContext Contexte utilisateur
   * @param roleNames Noms des rôles
   * @returns true si l'utilisateur a au moins un de ces rôles
   */
  static hasAnyRole(userContext: UserContext, roleNames: string[]): boolean {
    return roleNames.some((role) => userContext.roles.includes(role));
  }

  /**
   * Vérifie si l'utilisateur a tous les rôles spécifiés
   * @param userContext Contexte utilisateur
   * @param roleNames Noms des rôles
   * @returns true si l'utilisateur a tous ces rôles
   */
  static hasAllRoles(userContext: UserContext, roleNames: string[]): boolean {
    return roleNames.every((role) => userContext.roles.includes(role));
  }
}
