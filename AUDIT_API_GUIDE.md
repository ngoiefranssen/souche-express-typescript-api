# 📊 Guide API Audit - Next.js Integration

Guide complet pour utiliser les endpoints d'audit depuis Next.js.

## 🎯 Endpoints Disponibles

| Endpoint | Méthode | Auth | Permission | Description |
|----------|---------|------|------------|-------------|
| `/audit/user-activity` | POST | ❌ Non | - | Enregistrer un événement |
| `/audit/logs` | GET | ✅ Oui | `audit:read` | Récupérer les logs (paginés) |
| `/audit/stats` | GET | ✅ Oui | `audit:read` | Statistiques d'audit |

---

## 📝 1. Récupérer les Logs d'Audit

### Backend

**Endpoint:** `GET /api/v1/audit/logs`

**Query Parameters:**

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `page` | number | 1 | Page actuelle |
| `limit` | number | 50 | Nombre de logs par page |
| `userId` | number | - | Filtrer par utilisateur |
| `action` | string | - | Filtrer par action |
| `severity` | string | - | Filtrer par gravité |
| `startDate` | ISO date | - | Date de début |
| `endDate` | ISO date | - | Date de fin |

**Réponse:**

```json
{
  "status": "success",
  "data": {
    "logs": [
      {
        "id": 1,
        "userId": 5,
        "action": "login_success",
        "resource": "auth",
        "ipHash": "sha256:abc...",
        "userAgent": "Mozilla/5.0...",
        "severity": "info",
        "success": true,
        "details": {},
        "createdAt": "2026-02-04T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 50,
      "totalPages": 3
    }
  }
}
```

---

### Frontend Next.js

**`src/lib/api/audit.ts`**

```typescript
import { apiClient } from './client';

export interface AuditLog {
  id: number;
  userId?: number;
  action: string;
  resource?: string;
  resourceId?: string;
  ipHash?: string;
  userAgent?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  success: boolean;
  errorMessage?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface AuditLogsResponse {
  status: 'success';
  data: {
    logs: AuditLog[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  userId?: number;
  action?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
}

export const auditApi = {
  /**
   * Récupérer les logs d'audit
   */
  async getLogs(params: GetAuditLogsParams = {}): Promise<AuditLogsResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/audit/logs?${queryParams.toString()}`;
    return apiClient.get<AuditLogsResponse>(endpoint);
  },

  /**
   * Statistiques d'audit
   */
  async getStats(): Promise<{
    status: 'success';
    data: {
      stats: Array<{ action: string; count: number }>;
    };
  }> {
    return apiClient.get('/audit/stats');
  },
};
```

---

## 🎨 Composants React

### 1. Liste des Logs d'Audit

**`src/components/audit/AuditLogsList.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { auditApi, type AuditLog } from '@/lib/api/audit';

export function AuditLogsList() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await auditApi.getLogs({ page, limit: 20 });
      setLogs(response.data.logs);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Erreur chargement logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Chargement des logs...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Logs d'Audit</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Utilisateur</th>
              <th className="px-4 py-2 text-left">Action</th>
              <th className="px-4 py-2 text-left">Ressource</th>
              <th className="px-4 py-2 text-left">Gravité</th>
              <th className="px-4 py-2 text-left">Statut</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 text-sm">
                  {new Date(log.createdAt).toLocaleString('fr-FR')}
                </td>
                <td className="px-4 py-2">
                  {log.userId || '-'}
                </td>
                <td className="px-4 py-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {log.action}
                  </code>
                </td>
                <td className="px-4 py-2">{log.resource || '-'}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      log.severity === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : log.severity === 'error'
                        ? 'bg-orange-100 text-orange-800'
                        : log.severity === 'warning'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {log.severity}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {log.success ? (
                    <span className="text-green-600">✓ Succès</span>
                  ) : (
                    <span className="text-red-600">✗ Échec</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Précédent
        </button>
        <span>
          Page {page} sur {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
```

---

### 2. Filtres Avancés

**`src/components/audit/AuditFilters.tsx`**

```typescript
'use client';

import { useState } from 'react';
import type { GetAuditLogsParams } from '@/lib/api/audit';

interface AuditFiltersProps {
  onFilterChange: (filters: GetAuditLogsParams) => void;
}

export function AuditFilters({ onFilterChange }: AuditFiltersProps) {
  const [filters, setFilters] = useState<GetAuditLogsParams>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange(filters);
  };

  const handleReset = () => {
    setFilters({});
    onFilterChange({});
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow space-y-4">
      <h3 className="text-lg font-semibold">Filtres</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Action */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Action
          </label>
          <select
            value={filters.action || ''}
            onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">Toutes</option>
            <option value="login_success">Login réussi</option>
            <option value="login_failed">Login échoué</option>
            <option value="logout">Déconnexion</option>
            <option value="access_denied">Accès refusé</option>
            <option value="data_change">Modification de données</option>
          </select>
        </div>

        {/* Gravité */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Gravité
          </label>
          <select
            value={filters.severity || ''}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value || undefined })}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">Toutes</option>
            <option value="info">Info</option>
            <option value="warning">Avertissement</option>
            <option value="error">Erreur</option>
            <option value="critical">Critique</option>
          </select>
        </div>

        {/* Date de début */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Date de début
          </label>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        {/* Date de fin */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Date de fin
          </label>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Appliquer les filtres
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Réinitialiser
        </button>
      </div>
    </form>
  );
}
```

---

### 3. Statistiques d'Audit

**`src/components/audit/AuditStats.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { auditApi } from '@/lib/api/audit';

export function AuditStats() {
  const [stats, setStats] = useState<Array<{ action: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await auditApi.getStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Chargement des statistiques...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Statistiques d'Audit</h3>
      
      <div className="space-y-3">
        {stats.map((stat) => (
          <div key={stat.action} className="flex justify-between items-center">
            <span className="text-sm font-medium">{stat.action}</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              {stat.count}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="text-sm text-gray-600">
          Total d'événements:{' '}
          <span className="font-semibold">
            {stats.reduce((sum, s) => sum + Number(s.count), 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## 📄 Page Complète

**`src/app/admin/audit/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { AuditLogsList } from '@/components/audit/AuditLogsList';
import { AuditFilters } from '@/components/audit/AuditFilters';
import { AuditStats } from '@/components/audit/AuditStats';
import type { GetAuditLogsParams } from '@/lib/api/audit';

export default function AuditPage() {
  const [filters, setFilters] = useState<GetAuditLogsParams>({});

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Audit & Logs</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Statistiques */}
          <div className="lg:col-span-1">
            <AuditStats />
          </div>

          {/* Filtres */}
          <div className="lg:col-span-2">
            <AuditFilters onFilterChange={setFilters} />
          </div>
        </div>

        {/* Liste des logs */}
        <AuditLogsList filters={filters} />
      </div>
    </div>
  );
}
```

---

## 🔒 Sécurité

### Permissions Requises

Pour accéder aux endpoints d'audit, l'utilisateur doit avoir :

```typescript
// Permission nécessaire
permission: 'audit:read'

// Généralement attribué aux rôles :
- Super Admin
- Admin
- Auditeur
```

### Vérifier les Permissions

```typescript
// Frontend - Afficher conditionnellement
'use client';

import { useAuth } from '@/hooks/useAuth';

export function AuditSection() {
  const { user } = useAuth();

  // Vérifier si l'utilisateur a la permission audit:read
  const hasAuditPermission = user?.profile?.roles?.some(
    (role) => role.permissions?.some((perm) => perm.name === 'audit:read')
  );

  if (!hasAuditPermission) {
    return <div>Accès non autorisé</div>;
  }

  return <AuditLogsList />;
}
```

---

## 📊 Résumé des Améliorations

### ✅ Ce qui a été ajouté

| Fonctionnalité | Avant | Après |
|----------------|-------|-------|
| **Pagination** | ❌ Non | ✅ Oui (page, limit) |
| **Filtres** | ❌ Non | ✅ Oui (userId, action, dates, etc.) |
| **Authentification** | ❌ Non | ✅ Oui (token JWT) |
| **Autorisation** | ❌ Non | ✅ Oui (permission `audit:read`) |
| **Statistiques** | ❌ Non | ✅ Oui (nouveau endpoint) |
| **Tri** | ❌ Non | ✅ Oui (par date DESC) |
| **Gestion erreurs** | ⚠️ Basique | ✅ Complète (next(error)) |

---

**Vos logs d'audit sont maintenant sécurisés, paginés et filtrables ! 📊✅**
