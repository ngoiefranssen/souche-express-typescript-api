# 🔐 Système de Gestion des Permissions RBAC + ABAC

## 📚 Documentation

Ce projet implémente un système de contrôle d'accès professionnel combinant **RBAC** (Role-Based Access Control) et **ABAC** (Attribute-Based Access Control), conforme aux normes internationales.

---

## 🎯 Normes et Standards Respectés

- ✅ **ISO/IEC 10181-3** : Standard international pour RBAC
- ✅ **NIST SP 800-162** : Guide ABAC du gouvernement américain
- ✅ **OAuth 2.0** : RFC 6749 (Authentification)
- ✅ **JWT** : RFC 7519 (JSON Web Tokens)
- ✅ **RGPD** : Protection des données personnelles (hashing IP, audit)
- ✅ **SOC2** : Audit trail complet
- ✅ **ISO 27001** : Sécurité de l'information

---

## 🏗️ Architecture

### Composants Principaux

```
┌──────────────────────────────────────────────────┐
│                    Backend                        │
├──────────────────────────────────────────────────┤
│  1. Models                                        │
│     ├── Permission (permissions granulaires)      │
│     ├── Role (groupes de permissions)             │
│     ├── RolePermission (liaison many-to-many)     │
│     └── AuditLog (traçabilité complète)           │
│                                                    │
│  2. Middlewares                                   │
│     ├── authenticateToken (JWT validation)        │
│     └── authorize (Permission checking)           │
│                                                    │
│  3. Utils                                         │
│     ├── PermissionChecker (RBAC + ABAC logic)     │
│     └── Audit (Logging complet)                   │
└──────────────────────────────────────────────────┘
```

---

## 📦 Fichiers Créés

### Modèles
- ✅ `src/models/admin/permission.model.ts` - Modèle Permission
- ✅ `src/models/admin/role_permission.model.ts` - Table de liaison
- ✅ `src/models/audit/audit_log.model.ts` - Logs d'audit enrichis

### Middlewares
- ✅ `src/middlewares/authorization.middleware.ts` - Middleware d'autorisation complet

### Utilitaires
- ✅ `src/utils/permission_checker.ts` - Vérification RBAC + ABAC
- ✅ `src/utils/audit.ts` - Système d'audit enrichi

### Contrôleurs et Routes
- ✅ `src/controllers/admin/permission.controller.ts` - Gestion des permissions
- ✅ `src/routes/admin/permissions.routes.ts` - Endpoints API
- ✅ `src/schemas/admin/permissions.schema.ts` - Validation Zod

### Types
- ✅ `src/types/permissions.d.ts` - Types TypeScript complets

### Seeds
- ✅ `src/db/seeds/permissions.seed.ts` - Initialisation des permissions

### Documentation
- ✅ `FRONTEND_GUIDE.md` - Guide complet pour le frontend
- ✅ `PERMISSIONS_SYSTEM.md` - Ce fichier

---

## 🚀 Installation et Configuration

### 1. Installer les dépendances

Les dépendances nécessaires sont déjà dans votre `package.json`.

### 2. Synchroniser la base de données

```bash
# Créer les nouvelles tables (permissions, role_permissions)
npm run dev
```

Sequelize créera automatiquement les tables manquantes.

### 3. Initialiser les permissions système

```bash
# Exécuter le script de seed
npx ts-node src/db/seeds/permissions.seed.ts
```

Ce script va :
- ✅ Créer toutes les permissions système
- ✅ Créer les rôles par défaut (Super Admin, Admin, Manager, User)
- ✅ Assigner les permissions aux rôles

### 4. Vérifier l'installation

```bash
# Démarrer le serveur
npm run dev

# Tester l'API
curl http://localhost:7700/health
```

---

## 📖 Utilisation Backend

### 1. Protéger une route avec permissions

```typescript
import { authenticateToken } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorization.middleware';

// Permission unique
router.get('/users', 
  authenticateToken, 
  authorize('users:read'),
  getUsers
);

// Plusieurs permissions (OR)
router.post('/users', 
  authenticateToken,
  authorize(['users:create', 'users:manage']),
  createUser
);

// Toutes les permissions requises (AND)
router.delete('/users/:id',
  authenticateToken,
  authorize(['users:delete', 'audit:create'], { requireAll: true }),
  deleteUser
);

// Autoriser le propriétaire
router.put('/users/:id',
  authenticateToken,
  authorize('users:update', {
    allowOwner: (req) => parseInt(req.params.id)
  }),
  updateUser
);

// Avec audit
router.post('/users',
  authenticateToken,
  authorize('users:create', { audit: true }),
  createUser
);
```

### 2. Vérifier un rôle

```typescript
import { requireRole, requireAllRoles } from '../middlewares/authorization.middleware';

// Rôle unique
router.get('/admin/dashboard',
  authenticateToken,
  requireRole('Admin'),
  getDashboard
);

// Plusieurs rôles (OR)
router.get('/management',
  authenticateToken,
  requireRole(['Admin', 'Manager']),
  getManagement
);

// Tous les rôles requis (AND)
router.get('/super-admin',
  authenticateToken,
  requireAllRoles(['Super Admin', 'Security Admin']),
  getSuperAdmin
);
```

### 3. Utiliser le contexte utilisateur dans un contrôleur

```typescript
import { AuthorizedRequest } from '../middlewares/authorization.middleware';

export const getUsers = async (req: AuthorizedRequest, res: Response) => {
  // Accéder au contexte utilisateur enrichi
  const userContext = req.userContext;
};
```

### 4. Logger un événement d'audit

```typescript
import { logAudit, AuditAction, AuditSeverity } from '../utils/audit';

// Log simple
await logAudit({
  userId: 1,
  action: 'user_created',
  resource: 'users',
  resourceId: 5,
  details: { name: 'John Doe' }
});

// Log avec toutes les options
await logAudit({
  userId: req.userContext?.userId,
  action: AuditAction.ACCESS_DENIED,
  resource: req.path,
  severity: AuditSeverity.WARNING,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  success: false,
  errorMessage: 'Permission refusée',
  details: { attemptedAction: 'delete_user' }
});
```

---

## 🎨 Utilisation Frontend

Consultez le guide complet : **[FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)**

### Résumé rapide

1. **Login et récupération du token**
```javascript
const response = await api.post('/auth/login', { email, password });
localStorage.setItem('authToken', response.data.token);
```

2. **Envoyer le token dans les requêtes**
```javascript
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

3. **Vérifier les permissions côté frontend**
```javascript
const checker = new PermissionChecker(userPermissions);
if (checker.hasPermission('users:create')) {
  // Afficher le bouton "Créer"
}
```

---

## 📊 Structure des Permissions

### Format

```
resource:action
```

### Exemples

- `users:read` - Lire les utilisateurs
- `users:create` - Créer des utilisateurs
- `users:*` - Toutes les actions sur users
- `system:*` - Accès super admin total

### Actions disponibles

| Action | Description |
|--------|-------------|
| `read` | Consultation/lecture |
| `create` | Création |
| `update` | Modification |
| `delete` | Suppression |
| `execute` | Exécution d'opérations |
| `manage` | Gestion complète (assignation, etc.) |
| `*` | Toutes les actions |

### Ressources système

- `users` - Utilisateurs
- `profiles` - Profils
- `roles` - Rôles
- `permissions` - Permissions
- `audit` - Audit logs
- `employment_status` - Statuts d'emploi
- `sessions` - Sessions utilisateur
- `system` - Système (super admin)

---

## 🔍 Système ABAC (Attribute-Based Access Control)

### Définir des conditions ABAC

```typescript
// Créer une permission avec conditions
await PermissionModel.create({
  name: 'users:read',
  resource: 'users',
  action: 'read',
  conditions: {
    department: 'IT',           // Égalité simple
    region: { in: ['EU', 'US'] }, // Dans la liste
    clearanceLevel: { gte: 3 }   // Supérieur ou égal
  }
});
```

### Opérateurs ABAC supportés

| Opérateur | Description | Exemple |
|-----------|-------------|---------|
| `eq` | Égal à | `{ status: { eq: 'active' } }` |
| `ne` | Différent de | `{ status: { ne: 'banned' } }` |
| `gt` | Supérieur à | `{ age: { gt: 18 } }` |
| `gte` | Supérieur ou égal | `{ level: { gte: 5 } }` |
| `lt` | Inférieur à | `{ price: { lt: 100 } }` |
| `lte` | Inférieur ou égal | `{ score: { lte: 50 } }` |
| `in` | Dans la liste | `{ role: { in: ['admin', 'mod'] } }` |
| `nin` | Pas dans la liste | `{ status: { nin: ['banned', 'suspended'] } }` |
| `contains` | Contient (string) | `{ email: { contains: '@company.com' } }` |
| `startsWith` | Commence par | `{ name: { startsWith: 'John' } }` |
| `endsWith` | Se termine par | `{ file: { endsWith: '.pdf' } }` |

### Vérifier les conditions ABAC

```typescript
import { PermissionChecker } from './utils/permission_checker';

const conditions = {
  department: 'IT',
  clearanceLevel: { gte: 3 }
};

const userContext = {
  userId: 1,
  email: 'user@example.com',
  roles: ['Manager'],
  permissions: ['users:read'],
  attributes: {
    department: 'IT',
    clearanceLevel: 5
  }
};

const allowed = PermissionChecker.checkABACConditions(
  conditions, 
  userContext
);
// allowed = true
```

---

## 📈 Audit et Conformité

### Événements auditées automatiquement

- ✅ Authentification (login, logout, échecs)
- ✅ Accès aux ressources (autorisé/refusé)
- ✅ Modifications de données (CRUD)
- ✅ Changements de permissions/rôles
- ✅ Violations de sécurité

### Consulter les logs

```bash
# Via API
GET /api/v1/audit?userId=1&action=login&startDate=2026-01-01
```

### Conformité RGPD

- ✅ **Hashage IP** : Les adresses IP sont hashées (SHA-256)
- ✅ **Durée de rétention** : Configurable (90 jours par défaut)
- ✅ **Droit à l'oubli** : Anonymisation possible
- ✅ **Traçabilité** : Qui a accédé à quoi et quand

---

## 🔧 Configuration Avancée

### Variables d'environnement

```env
# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Session
SESSION_SECRET=another-secret-key

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password
```

### Personnaliser les permissions par défaut

Éditez `src/db/seeds/permissions.seed.ts` pour ajouter/modifier les permissions.

---

## 🧪 Tests

### Tester une permission

```bash
# Login
curl -X POST http://localhost:7700/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin07@admin.com","password":"password"}'

# Récupérer le token et tester
curl -X GET http://localhost:7700/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Tester l'accès refusé

```bash
# Se connecter avec un utilisateur simple
# Essayer d'accéder à une ressource admin
# Devrait retourner 403 Forbidden
```

---

## 🐛 Dépannage

### Problème : "Permission non trouvée"

**Solution :** Exécutez le seed des permissions :
```bash
npx ts-node src/db/seeds/permissions.seed.ts
```

### Problème : "Token invalide"

**Solutions :**
1. Vérifiez que `JWT_SECRET` est défini dans `.env`
2. Vérifiez que le token est envoyé dans le header `Authorization: Bearer <token>`
3. Le token a peut-être expiré, reconnectez-vous

### Problème : "Session expirée"

**Solution :** Le système déconnecte après 1h d'inactivité. Reconnectez-vous.

### Problème : Tables manquantes

**Solution :**
```bash
# Synchroniser la base de données
npm run dev

# Ou forcer la synchronisation
# Dans server.ts, temporairement :
await sequelize.sync({ force: true }); // ATTENTION : Efface les données !
```

---

## 📚 Ressources

### Documentation complète

- **[Frontend Guide](./FRONTEND_GUIDE.md)** - Intégration frontend détaillée
- **[API Documentation](#)** - Documentation des endpoints (à venir)

### Standards et références

- [ISO/IEC 10181-3 (RBAC)](https://www.iso.org/standard/18199.html)
- [NIST SP 800-162 (ABAC)](https://csrc.nist.gov/publications/detail/sp/800-162/final)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [JWT RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)

---

## 🤝 Contribution

Ce système a été développé selon les meilleures pratiques de l'industrie. Pour toute amélioration ou suggestion, contactez l'équipe de développement.

---

## 📄 Licence

ISC

---

## 👨‍💻 Auteur

**Ngoie Kabamba Franssen**

---

**Version:** 1.0.0  
**Date:** 2026-02-03
