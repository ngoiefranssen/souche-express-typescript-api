import { Request, Response } from 'express';
import PermissionModel from '../../models/permission/permission.model';
import RoleModel from '../../models/admin/role.model';
import RolePermission from '../../models/permission/role_permission.model';
import { AppError } from '../../utils/errors';
import { AuthorizedRequest } from '../../middlewares/authorization.middleware';
import { logDataChange, AuditAction } from '../../utils/audit';

/**
 * Récupère toutes les permissions
 */
export const getAllPermissions = async (req: Request, res: Response) => {
  const { category, resource, action } = req.query;

  const whereClause: any = {};

  if (category) whereClause.category = category;
  if (resource) whereClause.resource = resource;
  if (action) whereClause.action = action;

  const permissions = await PermissionModel.findAll({
    where: whereClause,
    order: [
      ['category', 'DESC'],
      ['resource', 'DESC'],
      ['action', 'DESC'],
    ],
  });

  res.json({
    success: true,
    count: permissions.length,
    data: permissions,
  });
};

/**
 * Récupère une permission par ID
 */
export const getPermissionById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const permission = await PermissionModel.findByPk(id, {
    include: [
      {
        model: RoleModel,
        as: 'roles',
        through: { attributes: [] },
      },
    ],
  });

  if (!permission) {
    throw new AppError(404, 'Permission non trouvée');
  }

  res.json({
    success: true,
    data: permission,
  });
};

/**
 * Crée une nouvelle permission
 */
export const createPermission = async (req: AuthorizedRequest, res: Response) => {
  const { name, resource, action, description, category, priority, conditions } = req.body;

  // Vérifier que la permission n'existe pas déjà
  const existing = await PermissionModel.findOne({ where: { name } });
  if (existing) {
    throw new AppError(400, 'Cette permission existe déjà');
  }

  const permission = await PermissionModel.create({
    name,
    resource,
    action,
    description,
    category,
    priority: priority || 50,
    isSystem: false,
    conditions: conditions || {},
  });

  // Audit
  if (req.userContext) {
    await logDataChange(
      req.userContext.userId,
      AuditAction.PERMISSION_CREATED,
      'permissions',
      permission.id,
      { name, resource, action },
      req.ip
    );
  }

  res.status(201).json({
    success: true,
    message: 'Permission créée avec succès',
    data: permission,
  });
};

/**
 * Met à jour une permission
 */
export const updatePermission = async (req: AuthorizedRequest, res: Response) => {
  const { id } = req.params;
  const { name, resource, action, description, category, priority, conditions } = req.body;

  const permission = await PermissionModel.findByPk(id);

  if (!permission) {
    throw new AppError(404, 'Permission non trouvée');
  }

  // Ne pas permettre la modification des permissions système
  if (permission.isSystem) {
    throw new AppError(403, 'Les permissions système ne peuvent pas être modifiées');
  }

  const oldValues = { ...permission.toJSON() };

  await permission.update({
    name: name || permission.name,
    resource: resource || permission.resource,
    action: action || permission.action,
    description: description !== undefined ? description : permission.description,
    category: category !== undefined ? category : permission.category,
    priority: priority !== undefined ? priority : permission.priority,
    conditions: conditions !== undefined ? conditions : permission.conditions,
  });

  // Audit
  if (req.userContext) {
    await logDataChange(
      req.userContext.userId,
      AuditAction.PERMISSION_UPDATED,
      'permissions',
      permission.id,
      { before: oldValues, after: permission.toJSON() },
      req.ip
    );
  }

  res.json({
    success: true,
    message: 'Permission mise à jour avec succès',
    data: permission,
  });
};

/**
 * Supprime une permission
 */
export const deletePermission = async (req: AuthorizedRequest, res: Response) => {
  const { id } = req.params;

  const permission = await PermissionModel.findByPk(id);

  if (!permission) {
    throw new AppError(404, 'Permission non trouvée');
  }

  // Ne pas permettre la suppression des permissions système
  if (permission.isSystem) {
    throw new AppError(403, 'Les permissions système ne peuvent pas être supprimées');
  }

  await permission.destroy();

  // Audit
  if (req.userContext) {
    await logDataChange(
      req.userContext.userId,
      AuditAction.PERMISSION_DELETED,
      'permissions',
      permission.id,
      { name: permission.name },
      req.ip
    );
  }

  res.json({
    success: true,
    message: 'Permission supprimée avec succès',
  });
};

/**
 * Assigne une permission à un rôle
 */
export const assignPermissionToRole = async (req: AuthorizedRequest, res: Response) => {
  const { roleId, permissionId } = req.body;
  const { overrideConditions, expiresAt } = req.body;

  const role = await RoleModel.findByPk(roleId);
  const permission = await PermissionModel.findByPk(permissionId);

  if (!role || !permission) {
    throw new AppError(404, 'Rôle ou permission non trouvé');
  }

  // Vérifier si l'association existe déjà
  const existing = await RolePermission.findOne({
    where: { roleId, permissionId },
  });

  if (existing) {
    throw new AppError(400, 'Cette permission est déjà assignée à ce rôle');
  }

  await RolePermission.create({
    roleId,
    permissionId,
    overrideConditions: overrideConditions || null,
    expiresAt: expiresAt || null,
    isActive: true,
  });

  // Audit
  if (req.userContext) {
    await logDataChange(
      req.userContext.userId,
      AuditAction.PERMISSION_ASSIGNED,
      'roles',
      roleId,
      { permissionId, permissionName: permission.name },
      req.ip
    );
  }

  res.status(201).json({
    success: true,
    message: 'Permission assignée au rôle avec succès',
  });
};

/**
 * Révoque une permission d'un rôle
 */
export const revokePermissionFromRole = async (req: AuthorizedRequest, res: Response) => {
  const { roleId, permissionId } = req.body;

  const rolePermission = await RolePermission.findOne({
    where: { roleId, permissionId },
  });

  if (!rolePermission) {
    throw new AppError(404, 'Association non trouvée');
  }

  await rolePermission.destroy();

  // Audit
  if (req.userContext) {
    await logDataChange(
      req.userContext.userId,
      AuditAction.PERMISSION_REVOKED,
      'roles',
      roleId,
      { permissionId },
      req.ip
    );
  }

  res.json({
    success: true,
    message: 'Permission révoquée du rôle avec succès',
  });
};

/**
 * Récupère toutes les permissions d'un rôle
 */
export const getRolePermissions = async (req: Request, res: Response) => {
  const { roleId } = req.params;

  const role = await RoleModel.findByPk(roleId, {
    include: [
      {
        model: PermissionModel,
        as: 'permissions',
        through: {
          attributes: ['overrideConditions', 'isActive', 'expiresAt'],
        },
      },
    ],
  });

  if (!role) {
    throw new AppError(404, 'Rôle non trouvé');
  }

  res.json({
    success: true,
    data: {
      role: role.label,
      permissions: role.permissions,
    },
  });
};

/**
 * Récupère les permissions groupées par catégorie
 */
export const getPermissionsByCategory = async (_req: Request, res: Response) => {
  const permissions = await PermissionModel.findAll({
    order: [
      ['category', 'DESC'],
      ['resource', 'DESC'],
      ['priority', 'DESC'],
    ],
  });

  // Grouper par catégorie
  const grouped = permissions.reduce((acc, permission) => {
    const category = permission.category || 'Autre';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, PermissionModel[]>);

  res.json({
    success: true,
    data: grouped,
  });
};
