# 🔐 Guide du Système JWT Access + Refresh Token

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Utilisation Frontend](#utilisation-frontend)
- [Flux d'authentification](#flux-dauthentification)
- [API Endpoints](#api-endpoints)
- [Sécurité](#sécurité)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

---

## Vue d'ensemble

Ce système implémente les **meilleures pratiques de sécurité** pour l'authentification JWT :

### ✅ Avantages

| Fonctionnalité | Description |
|----------------|-------------|
| **Access Token Court** | 1h (dev) / 15min (prod) - limite l'exposition en cas de vol |
| **Refresh Token Long** | 7 jours - meilleure expérience utilisateur |
| **Révocation Manuelle** | Logout = révocation immédiate de tous les tokens |
| **Traçabilité** | IP, User-Agent, device type enregistrés |
| **Nettoyage Auto** | Suppression automatique des tokens expirés |
| **Audit Complet** | Logs de toutes les connexions/déconnexions |

### 🎯 Conformité

- ✅ **OWASP Top 10** - Protection contre les attaques courantes
- ✅ **RFC 6749** - OAuth 2.0 (refresh token flow)
- ✅ **RFC 7519** - JWT Best Practices
- ✅ **RGPD** - Hash des IP, logs d'accès

---

## Architecture

### Structure des Tokens

```typescript
// Access Token (court - 15min à 1h)
{
  userId: number,
  email: string,
  profileId?: number,
  type: 'access',
  iat: number,
  exp: number,
  iss: 'souche-api',
  aud: 'souche-client'
}

// Refresh Token (long - 7 jours)
{
  userId: number,
  tokenId: string,  // UUID en DB
  type: 'refresh',
  iat: number,
  exp: number,
  iss: 'souche-api',
  aud: 'souche-client'
}
```

### Base de Données

**Table `refresh_tokens`**

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `user_id` | INTEGER | Utilisateur propriétaire |
| `token_hash` | STRING | Hash SHA-256 du token (sécurité) |
| `ip_address` | STRING | IP hachée |
| `user_agent` | STRING | User-Agent du client |
| `device_type` | STRING | mobile / desktop / tablet |
| `expires_at` | DATE | Date d'expiration |
| `is_revoked` | BOOLEAN | Token révoqué ? |
| `revoked_at` | DATE | Date de révocation |
| `revocation_reason` | STRING | Raison (logout, security, etc.) |
| `last_used_at` | DATE | Dernière utilisation |
| `usage_count` | INTEGER | Nombre d'utilisations |

---

## Configuration

### Variables d'environnement

**`.env`**

```bash
# JWT - Access Token (court)
JWT_SECRET=votre_secret_jwt_min_32_caracteres
JWT_ACCESS_EXPIRE=1h      # dev: 1h, prod: 15m

# JWT - Refresh Token (long)
JWT_REFRESH_SECRET=votre_refresh_secret_min_32_caracteres
JWT_REFRESH_EXPIRE=7d     # 7 jours
```

### Recommandations par environnement

| Environnement | Access Token | Refresh Token |
|---------------|--------------|---------------|
| **Development** | 1h | 7d |
| **Staging** | 30m | 7d |
| **Production** | 15m | 7d |
| **Application sensible** | 15m | 1d |

### Générer des secrets forts

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

---

## Utilisation Frontend

### 1. Installation

```bash
npm install axios
```

### 2. Configuration Axios avec intercepteur

**`api/auth.ts`**

```typescript
import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:7700/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Stockage des tokens
let accessToken: string | null = localStorage.getItem('accessToken');
let refreshToken: string | null = localStorage.getItem('refreshToken');

// Intercepteur de requête : ajouter le token
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponse : rafraîchir le token si expiré
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Si 401 et qu'on a un refresh token, tenter de rafraîchir
    if (
      error.response?.status === 401 &&
      refreshToken &&
      !originalRequest?._retry
    ) {
      originalRequest._retry = true;

      try {
        // Appeler l'endpoint de refresh
        const response = await axios.post(
          'http://localhost:7700/api/v1/auth/refresh-token',
          { refreshToken }
        );

        const { accessToken: newAccessToken } = response.data.data;

        // Mettre à jour le token
        accessToken = newAccessToken;
        localStorage.setItem('accessToken', newAccessToken);

        // Réessayer la requête originale
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token invalide : déconnecter l'utilisateur
        accessToken = null;
        refreshToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### 3. Fonctions d'authentification

**`services/authService.ts`**

```typescript
import api from '../api/auth';

interface LoginResponse {
  status: string;
  data: {
    user: {
      id: number;
      email: string;
      username: string;
      firstName: string;
      lastName: string;
    };
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
    tokenType: string;
  };
  message: string;
}

export const authService = {
  /**
   * Se connecter
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>(
      '/auth/oauth2/signin/authorized',
      { email, password }
    );

    const { accessToken, refreshToken } = response.data.data;

    // Stocker les tokens
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    return response.data;
  },

  /**
   * Se déconnecter
   */
  async logout(): Promise<void> {
    await api.post('/auth/singout/oauth2/authorized');

    // Supprimer les tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  /**
   * Rafraîchir le token (géré automatiquement par l'intercepteur)
   */
  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('Aucun refresh token disponible');
    }

    const response = await api.post('/auth/refresh-token', { refreshToken });
    const { accessToken } = response.data.data;

    localStorage.setItem('accessToken', accessToken);
    return accessToken;
  },

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  },
};
```

### 4. Exemple React Hook

**`hooks/useAuth.ts`**

```typescript
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    authService.isAuthenticated()
  );

  const login = async (email: string, password: string) => {
    try {
      await authService.login(email, password);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };

  return { isAuthenticated, login, logout };
}
```

---

## Flux d'authentification

### 1. Login

```mermaid
sequenceDiagram
    Client->>API: POST /auth/oauth2/signin/authorized
    API->>DB: Vérifier email/password
    DB-->>API: User trouvé
    API->>API: Générer Access Token (1h)
    API->>DB: Créer Refresh Token (7j)
    API-->>Client: {accessToken, refreshToken}
    Client->>LocalStorage: Stocker tokens
```

### 2. Requête protégée

```mermaid
sequenceDiagram
    Client->>API: GET /permissions (Authorization: Bearer token)
    API->>API: Vérifier Access Token
    alt Token valide
        API-->>Client: 200 OK + Data
    else Token expiré
        API-->>Client: 401 Unauthorized
        Client->>API: POST /auth/refresh-token {refreshToken}
        API->>DB: Vérifier Refresh Token
        API-->>Client: {newAccessToken}
        Client->>API: Retry GET /permissions (nouveau token)
        API-->>Client: 200 OK + Data
    end
```

### 3. Logout

```mermaid
sequenceDiagram
    Client->>API: POST /auth/singout/oauth2/authorized
    API->>DB: Révoquer tous les Refresh Tokens de l'utilisateur
    API->>DB: Désactiver session
    API->>AuditLog: Log déconnexion
    API-->>Client: 200 OK
    Client->>LocalStorage: Supprimer tokens
```

---

## API Endpoints

### POST `/auth/oauth2/signin/authorized`

**Connexion - Génère une paire de tokens**

**Request:**

```json
{
  "email": "admin07@admin.com",
  "password": "Admin@123"
}
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "email": "admin07@admin.com",
      "username": "admin",
      "firstName": "Super",
      "lastName": "Admin"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "1h",
    "tokenType": "Bearer"
  },
  "message": "Connexion réussie"
}
```

---

### POST `/auth/refresh-token`

**Rafraîchir l'access token**

**Request:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "1h",
    "tokenType": "Bearer"
  },
  "message": "Token rafraîchi avec succès"
}
```

**Response (401) - Refresh token invalide:**

```json
{
  "status": "error",
  "message": "Session expirée. Veuillez vous reconnecter."
}
```

---

### POST `/auth/singout/oauth2/authorized`

**Déconnexion - Révoque tous les tokens**

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**

```json
{
  "status": "success",
  "message": "Déconnexion réussie. Tous vos tokens ont été révoqués."
}
```

---

## Sécurité

### Mesures implémentées

| Mesure | Description |
|--------|-------------|
| **Token Hash** | Le refresh token est stocké hashé (SHA-256) en DB |
| **IP Tracking** | L'IP est hachée et associée au token |
| **Device Fingerprint** | User-Agent et device type enregistrés |
| **Révocation Immédiate** | Logout révoque tous les tokens utilisateur |
| **Expiration Auto** | Tokens expirés supprimés automatiquement |
| **Rotation** | Chaque refresh génère un nouveau access token |
| **HTTPS Only** | En production, cookies `secure: true` |
| **Audit Trail** | Toutes les actions sont loggées |

### Détection des vols de token

Le système détecte et peut bloquer :

1. **Changement d'IP** : Si le token est utilisé depuis une IP différente
2. **Changement d'appareil** : Si le User-Agent change
3. **Usage excessif** : `usage_count` peut révéler une anomalie
4. **Token déjà révoqué** : Tentative d'utilisation après logout

### Recommandations additionnelles

```typescript
// Dans le frontend, utiliser httpOnly cookies (plus sécurisé que localStorage)
// Backend : retourner le refresh token dans un cookie HttpOnly

res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
});
```

---

## Maintenance

### Nettoyage automatique

Le système démarre automatiquement 3 jobs cron :

| Job | Fréquence | Action |
|-----|-----------|--------|
| **Tokens expirés** | Toutes les heures | Supprime les refresh tokens expirés |
| **Vieux tokens révoqués** | Tous les jours à 2h | Supprime les tokens révoqués > 30 jours |
| **Sessions expirées** | Toutes les heures | Désactive les sessions inactives |

### Nettoyage manuel

```bash
# Via l'API (à créer pour les admins)
POST /api/v1/admin/cleanup-tokens

# Via script Node.js
node -e "require('./src/utils/jwt').cleanupExpiredTokens().then(count => console.log(count + ' tokens supprimés'))"
```

### Monitoring

```sql
-- Statistiques des refresh tokens
SELECT 
  COUNT(*) as total_tokens,
  COUNT(CASE WHEN is_revoked THEN 1 END) as revoked,
  COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired,
  COUNT(CASE WHEN is_revoked = false AND expires_at > NOW() THEN 1 END) as active
FROM refresh_tokens;

-- Tokens par utilisateur
SELECT 
  user_id,
  COUNT(*) as token_count,
  MAX(last_used_at) as last_activity
FROM refresh_tokens
WHERE is_revoked = false AND expires_at > NOW()
GROUP BY user_id
ORDER BY token_count DESC;

-- Détection d'anomalies (usage excessif)
SELECT *
FROM refresh_tokens
WHERE usage_count > 100  -- Seuil à ajuster
AND is_revoked = false;
```

---

## Troubleshooting

### Problème : "Refresh token invalide"

**Causes possibles :**

1. Token expiré (> 7 jours)
2. Token révoqué (logout précédent)
3. Token supprimé par le nettoyage auto
4. Secret JWT_REFRESH_SECRET changé

**Solution :**

```typescript
// Frontend : forcer une nouvelle connexion
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
window.location.href = '/login';
```

### Problème : "Access token expire trop vite"

**Causes :**

- `JWT_ACCESS_EXPIRE=15m` en production (comportement normal)

**Solutions :**

1. ✅ **Recommandé** : Implémenter l'intercepteur axios (refresh auto)
2. ⚠️ **Non recommandé** : Augmenter la durée (risque de sécurité)

### Problème : "Trop de tokens en base"

**Diagnostic :**

```sql
SELECT COUNT(*) FROM refresh_tokens;
```

**Solution :**

```bash
# Vérifier que les jobs cron sont démarrés
npm run dev  # Devrait afficher "✅ Job de nettoyage démarré"

# Nettoyage manuel
npm run db:seed -- --file src/db/seeds/cleanup-tokens.seed.ts
```

### Problème : "Session expirée immédiatement"

**Vérifier :**

1. Les horloges serveur/client sont synchronisées (NTP)
2. Le `JWT_ACCESS_EXPIRE` est correct dans `.env`
3. Le `JWT_SECRET` n'a pas changé

---

## Résumé des fichiers créés/modifiés

| Fichier | Description |
|---------|-------------|
| `src/models/auth/refresh_token.model.ts` | Modèle Refresh Token |
| `src/db/migrations/...-create-refresh-tokens-table.js` | Migration DB |
| `src/utils/jwt.ts` | Utilitaires JWT (génération, vérification) |
| `src/utils/token_cleaner.ts` | Jobs cron de nettoyage |
| `src/controllers/auth/auth.controller.ts` | Endpoints login/logout/refresh |
| `src/routes/auth/auth.routes.ts` | Routes auth |
| `src/schemas/auth/auth.schema.ts` | Validation Zod |
| `src/db/config/env.config.ts` | Config JWT |
| `.env` | Variables d'environnement |

---

## 📚 Ressources

- [RFC 6749 - OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7519 - JWT](https://datatracker.ietf.org/doc/html/rfc7519)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [JWT.io - Debugger](https://jwt.io/)

---

**✅ Votre système est maintenant conforme aux meilleures pratiques de sécurité JWT !**
