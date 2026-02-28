# Guide de Déconnexion Automatique

Système complet de déconnexion automatique en cas d'expiration du token ou d'inactivité de l'utilisateur.

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Configuration Backend](#configuration-backend)
- [Implémentation Frontend](#implémentation-frontend)
- [Composants React](#composants-react)
- [Hooks Personnalisés](#hooks-personnalisés)
- [Exemples Complets](#exemples-complets)

---

## Vue d'ensemble

### Cas de Déconnexion Automatique

| Cas | Délai | Action |
|-----|-------|--------|
| **Token expiré** | 1 heure (access token) | Refresh auto ou déconnexion |
| **Inactivité utilisateur** | 30 minutes | Avertissement puis déconnexion |
| **Refresh token expiré** | 7 jours | Déconnexion immédiate |
| **Fermeture onglet** | Immédiat | Session maintenue (7j) |

---

## Configuration Backend

### Variables d'environnement

Ajouter dans `.env` :

```bash
# Durée d'inactivité maximale avant déconnexion (en minutes)
MAX_INACTIVITY_MINUTES=30

# Durée d'avertissement avant déconnexion (en minutes)
WARNING_BEFORE_LOGOUT_MINUTES=5
```

### Appliquer le middleware d'activité

Modifier `src/server.ts` :

```typescript
import { trackActivity } from './middlewares/activity.middleware';

// Appliquer sur toutes les routes protégées
app.use('/api/v1', trackActivity);
```

---

## Implémentation Frontend

### 1. Configuration

**`src/config/auth.config.ts`**

```typescript
/**
 * Configuration de l'authentification et de l'inactivité
 */

export const AUTH_CONFIG = {
  // Durée de vie du token (1 heure)
  ACCESS_TOKEN_LIFETIME_MS: 60 * 60 * 1000,

  // Durée maximale d'inactivité (30 minutes)
  MAX_INACTIVITY_MS: 30 * 60 * 1000,

  // Avertissement avant déconnexion (5 minutes)
  WARNING_BEFORE_LOGOUT_MS: 5 * 60 * 1000,

  // Intervalle de vérification du token (toutes les minutes)
  TOKEN_CHECK_INTERVAL_MS: 60 * 1000,

  // Rafraîchir le token X minutes avant expiration
  REFRESH_BEFORE_EXPIRY_MS: 5 * 60 * 1000,

  // Événements qui réinitialisent le timer d'inactivité
  ACTIVITY_EVENTS: ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'],
} as const;
```

---

### 2. Détection d'Inactivité

**`src/hooks/useIdleTimer.ts`**

```typescript
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { AUTH_CONFIG } from '@/config/auth.config';

interface UseIdleTimerOptions {
  onIdle: () => void;
  onWarning?: () => void;
  idleTime?: number;
  warningTime?: number;
  events?: string[];
}

export function useIdleTimer({
  onIdle,
  onWarning,
  idleTime = AUTH_CONFIG.MAX_INACTIVITY_MS,
  warningTime = AUTH_CONFIG.WARNING_BEFORE_LOGOUT_MS,
  events = AUTH_CONFIG.ACTIVITY_EVENTS,
}: UseIdleTimerOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Annuler les timers existants
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Timer d'avertissement
    if (onWarning && warningTime) {
      const warningDelay = idleTime - warningTime;
      warningTimeoutRef.current = setTimeout(() => {
        onWarning();
      }, warningDelay);
    }

    // Timer de déconnexion
    timeoutRef.current = setTimeout(() => {
      onIdle();
    }, idleTime);
  }, [onIdle, onWarning, idleTime, warningTime]);

  useEffect(() => {
    // Initialiser le timer
    resetTimer();

    // Ajouter les event listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Nettoyer à la destruction
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [events, resetTimer]);

  return {
    resetTimer,
    getLastActivity: () => lastActivityRef.current,
  };
}
```

---

### 3. Vérification du Token

**`src/hooks/useTokenExpiry.ts`**

```typescript
'use client';

import { useEffect, useCallback, useState } from 'react';
import { jwtDecode } from 'jose';
import { AUTH_CONFIG } from '@/config/auth.config';

interface TokenPayload {
  exp: number;
  iat: number;
  userId: number;
}

interface UseTokenExpiryOptions {
  onExpired: () => void;
  onNearExpiry?: () => void;
  checkInterval?: number;
  refreshBeforeExpiry?: number;
}

export function useTokenExpiry({
  onExpired,
  onNearExpiry,
  checkInterval = AUTH_CONFIG.TOKEN_CHECK_INTERVAL_MS,
  refreshBeforeExpiry = AUTH_CONFIG.REFRESH_BEFORE_EXPIRY_MS,
}: UseTokenExpiryOptions) {
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);

  const checkToken = useCallback(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('accessToken');

    if (!token) {
      onExpired();
      return;
    }

    try {
      // Décoder le token (sans vérification)
      const decoded = JSON.parse(atob(token.split('.')[1])) as TokenPayload;
      const expiryTime = decoded.exp * 1000; // Convertir en ms
      const now = Date.now();
      const timeLeft = expiryTime - now;

      setTimeUntilExpiry(timeLeft);

      // Token expiré
      if (timeLeft <= 0) {
        onExpired();
        return;
      }

      // Token bientôt expiré
      if (timeLeft <= refreshBeforeExpiry && onNearExpiry) {
        onNearExpiry();
      }
    } catch (error) {
      console.error('Erreur lors du décodage du token:', error);
      onExpired();
    }
  }, [onExpired, onNearExpiry, refreshBeforeExpiry]);

  useEffect(() => {
    // Vérification initiale
    checkToken();

    // Vérification périodique
    const interval = setInterval(checkToken, checkInterval);

    return () => clearInterval(interval);
  }, [checkToken, checkInterval]);

  return {
    timeUntilExpiry,
    checkToken,
  };
}
```

---

### 4. Hook Combiné

**`src/hooks/useAutoLogout.ts`**

```typescript
'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIdleTimer } from './useIdleTimer';
import { useTokenExpiry } from './useTokenExpiry';
import { authApi } from '@/lib/api/auth';
import { AUTH_CONFIG } from '@/config/auth.config';

export function useAutoLogout() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [warningReason, setWarningReason] = useState<'idle' | 'expiry' | null>(null);

  /**
   * Déconnecter l'utilisateur
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      router.push('/login?reason=auto-logout');
    }
  }, [router]);

  /**
   * Rafraîchir le token
   */
  const refreshToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      await logout();
      return;
    }

    try {
      await authApi.refreshToken(refreshToken);
      setShowWarning(false);
      setWarningReason(null);
    } catch (error) {
      console.error('Erreur lors du refresh du token:', error);
      await logout();
    }
  }, [logout]);

  /**
   * Gérer l'avertissement d'inactivité
   */
  const handleIdleWarning = useCallback(() => {
    setShowWarning(true);
    setWarningReason('idle');
  }, []);

  /**
   * Gérer l'expiration du token
   */
  const handleTokenNearExpiry = useCallback(async () => {
    // Tenter de rafraîchir automatiquement
    await refreshToken();
  }, [refreshToken]);

  /**
   * Gérer le token expiré
   */
  const handleTokenExpired = useCallback(async () => {
    setShowWarning(true);
    setWarningReason('expiry');
    // Attendre 5 secondes avant de déconnecter
    setTimeout(logout, 5000);
  }, [logout]);

  /**
   * Rester connecté (réinitialiser les timers)
   */
  const stayConnected = useCallback(() => {
    setShowWarning(false);
    setWarningReason(null);
    // Le resetTimer est géré par useIdleTimer
  }, []);

  // Hook de détection d'inactivité
  const { resetTimer } = useIdleTimer({
    onIdle: logout,
    onWarning: handleIdleWarning,
  });

  // Hook de vérification du token
  const { timeUntilExpiry } = useTokenExpiry({
    onExpired: handleTokenExpired,
    onNearExpiry: handleTokenNearExpiry,
  });

  return {
    showWarning,
    warningReason,
    timeUntilExpiry,
    logout,
    stayConnected,
    resetTimer,
  };
}
```

---

## Composants React

### Modal d'Avertissement

**`src/components/auth/AutoLogoutWarning.tsx`**

```typescript
'use client';

import { useEffect, useState } from 'react';

interface AutoLogoutWarningProps {
  show: boolean;
  reason: 'idle' | 'expiry' | null;
  timeUntilExpiry: number | null;
  onStayConnected: () => void;
  onLogout: () => void;
}

export function AutoLogoutWarning({
  show,
  reason,
  timeUntilExpiry,
  onStayConnected,
  onLogout,
}: AutoLogoutWarningProps) {
  const [countdown, setCountdown] = useState(60); // 60 secondes

  useEffect(() => {
    if (!show) {
      setCountdown(60);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [show, onLogout]);

  if (!show) return null;

  const getMessage = () => {
    if (reason === 'idle') {
      return 'Vous êtes inactif depuis un moment. Vous allez être déconnecté automatiquement.';
    }
    if (reason === 'expiry') {
      return 'Votre session va expirer. Vous allez être déconnecté automatiquement.';
    }
    return 'Vous allez être déconnecté automatiquement.';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mr-4">
            <svg
              className="w-6 h-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Session Inactive</h3>
            <p className="text-sm text-gray-600">Déconnexion dans {countdown}s</p>
          </div>
        </div>

        <p className="text-gray-700 mb-6">{getMessage()}</p>

        {timeUntilExpiry && timeUntilExpiry > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              Temps restant de session:{' '}
              <span className="font-semibold">
                {Math.floor(timeUntilExpiry / 60000)} min {Math.floor((timeUntilExpiry % 60000) / 1000)} sec
              </span>
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onStayConnected}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
          >
            Rester connecté
          </button>
          <button
            onClick={onLogout}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 font-medium"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### Provider d'Auto-Déconnexion

**`src/providers/AutoLogoutProvider.tsx`**

```typescript
'use client';

import { useAutoLogout } from '@/hooks/useAutoLogout';
import { AutoLogoutWarning } from '@/components/auth/AutoLogoutWarning';

interface AutoLogoutProviderProps {
  children: React.ReactNode;
}

export function AutoLogoutProvider({ children }: AutoLogoutProviderProps) {
  const {
    showWarning,
    warningReason,
    timeUntilExpiry,
    logout,
    stayConnected,
  } = useAutoLogout();

  return (
    <>
      {children}
      <AutoLogoutWarning
        show={showWarning}
        reason={warningReason}
        timeUntilExpiry={timeUntilExpiry}
        onStayConnected={stayConnected}
        onLogout={logout}
      />
    </>
  );
}
```

---

### Intégration dans le Layout

**`src/app/layout.tsx`**

```typescript
import { AutoLogoutProvider } from '@/providers/AutoLogoutProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <AutoLogoutProvider>
          {children}
        </AutoLogoutProvider>
      </body>
    </html>
  );
}
```

---

## Exemples Complets

### Exemple 1 : Afficher le Statut de Session

**`src/components/SessionStatus.tsx`**

```typescript
'use client';

import { useEffect, useState } from 'react';

export function SessionStatus() {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const updateTimeLeft = () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setTimeLeft(null);
        return;
      }

      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        const expiryTime = decoded.exp * 1000;
        const now = Date.now();
        setTimeLeft(Math.max(0, expiryTime - now));
      } catch {
        setTimeLeft(null);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, []);

  if (timeLeft === null) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  const isWarning = timeLeft < 5 * 60 * 1000; // < 5 minutes

  return (
    <div
      className={`text-sm px-3 py-1 rounded-full ${
        isWarning
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-green-100 text-green-800'
      }`}
    >
      Session: {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}
```

---

### Exemple 2 : Page de Login avec Raison de Déconnexion

**`src/app/login/page.tsx`**

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const getMessage = () => {
    switch (reason) {
      case 'auto-logout':
        return 'Vous avez été déconnecté automatiquement pour inactivité.';
      case 'token-expired':
        return 'Votre session a expiré. Veuillez vous reconnecter.';
      case 'manual':
        return 'Vous vous êtes déconnecté avec succès.';
      default:
        return null;
    }
  };

  const message = getMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">Connexion</h2>

        {message && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
            {message}
          </div>
        )}

        <LoginForm />
      </div>
    </div>
  );
}
```

---

## Configuration Recommandée

### Durées par Type d'Application

| Type | Inactivité Max | Avertissement | Access Token | Refresh Token |
|------|----------------|---------------|--------------|---------------|
| **Admin/Interne** | 30 min | 5 min avant | 1h | 7j |
| **E-commerce** | 60 min | 10 min avant | 1h | 30j |
| **Banque** | 10 min | 2 min avant | 15min | 1j |
| **Application publique** | 2h | 15 min avant | 1h | 30j |

---

## Tableau de Bord de Session

**`src/components/SessionDashboard.tsx`**

```typescript
'use client';

import { useAutoLogout } from '@/hooks/useAutoLogout';
import { useAuth } from '@/hooks/useAuth';

export function SessionDashboard() {
  const { timeUntilExpiry, logout } = useAutoLogout();
  const { user } = useAuth();

  if (!user || timeUntilExpiry === null) return null;

  const minutes = Math.floor(timeUntilExpiry / 60000);
  const isWarning = timeUntilExpiry < 10 * 60 * 1000; // < 10 minutes

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">État de la Session</h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Utilisateur</span>
          <span className="font-medium">{user.username}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Temps restant</span>
          <span
            className={`font-medium ${
              isWarning ? 'text-yellow-600' : 'text-green-600'
            }`}
          >
            {minutes} minutes
          </span>
        </div>

        <div className="pt-3 border-t">
          <button
            onClick={logout}
            className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700"
          >
            Se déconnecter manuellement
          </button>
        </div>
      </div>

      {isWarning && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            Votre session va bientôt expirer
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## Résumé

### Fonctionnalités Implémentées

| Fonctionnalité | Description | État |
|----------------|-------------|------|
| **Détection d'inactivité** | 30 min sans activité |
| **Avertissement** | Modal 5 min avant |
| **Token expiry check** | Vérification toutes les 1 min 
| **Refresh automatique** | 5 min avant expiration 
| **Déconnexion auto** | Si idle ou token expiré
| **Tracking activité** | Backend + Frontend
| **Modal personnalisée** | Countdown + actions

### Flux Complet

```
1. Utilisateur se connecte
   ↓
2. Timer d'inactivité démarre (30 min)
   ↓
3. Timer de vérification token démarre (1 min)
   ↓
4. Si activité détectée → Reset timers
   ↓
5. Si 25 min sans activité → Modal avertissement
   ↓
6. Si 30 min sans activité → Déconnexion auto
   ↓
7. Si token proche expiration (5 min) → Refresh auto
   ↓
8. Si refresh échoue → Déconnexion auto
```

**Votre système de déconnexion automatique est maintenant complet et professionnel ! **
