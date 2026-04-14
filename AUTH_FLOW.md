# Flux d'Authentification - Dealss

## Vue d'ensemble

L'application Dealss utilise un système d'authentification moderne basé sur JWT avec localStorage pour la persistance.

## Architecture

```
App (AuthProvider)
  ├── AuthContext (gère l'état utilisateur)
  ├── Router
  │   ├── Welcome Screen
  │   ├── Sign Up Screen
  │   ├── Sign In Screen
  │   ├── Forgot Password Screen
  │   ├── Reset Password Screen
  │   └── Home (et autres écrans)
  └── ProtectedRoute (redirections conditionnelles)
```

## Fichiers clés

### `src/app/context/AuthContext.tsx`
- **Rôle**: Gère l'état global de l'authentification
- **Features**:
  - Sign Up / Sign In
  - Logout
  - Forgot Password / Reset Password
  - Vérification du token au démarrage
  - Stockage en localStorage
  - États de chargement

### `src/app/context/ProtectedRoute.tsx`
- **Rôle**: Protège les routes sensibles
- **Composants**:
  - `ProtectedRoute`: Redirige vers /welcome si pas authentifié
  - `AuthRoute`: Redirige vers / si l'utilisateur est authentifié (pour Sign In/Up)

### Écrans d'authentification

#### `WelcomeScreen.tsx`
- Page d'accueil de bienvenue
- Options: Create Account, Sign In, ou Continue as Guest
- Redirige automatiquement vers Home si déjà connecté

#### `SignUpScreen.tsx`
- Formulaire d'inscription
- Validation des données
- Appelle `auth.signup()` via l'API backend

#### `SignInScreen.tsx`
- Formulaire de connexion
- Lien "Forgot Password"
- Appelle `auth.signin()` via l'API backend

#### `ForgotPasswordScreen.tsx`
- Formulaire de demande de réinitialisation
- Affiche le token de réinitialisation
- Lien vers ResetPasswordScreen

#### `ResetPasswordScreen.tsx`
- Formulaire de nouvelle password
- Valide le token de réinitialisation
- Appelle `auth.resetPassword()` via l'API backend

## Flux utilisateur

### Première visite
```
App lance → AuthContext initialise → localStorage vide
 ↓
affiche WelcomeScreen → options:
  1. Créer un compte → SignUpScreen
  2. Se connecter → SignInScreen
  3. Continuer en tant qu'invité → Home
```

### Après avoir cliqué "Continue as Guest"
```
markWelcomeSeen() → localStorage['seen_welcome'] = true
 ↓
Utilisateur peut accéder à Home sans être connecté
 ↓
Les boutons Sign In/Up sont disponibles dans Home
```

### Inscription (Sign Up)
```
SignUpScreen → rempli le formulaire
 ↓
handleSubmit() → auth.signup()
 ↓
Frontend POST /api/auth/signup
 ↓
Backend valide et crée l'utilisateur
 ↓
Retourne token + user
 ↓
localStorage['auth_token'] = token
 ↓
Redirige vers Home (connecté)
```

### Connexion (Sign In)
```
SignInScreen → rempli email + password
 ↓
handleSubmit() → auth.signin()
 ↓
Frontend POST /api/auth/signin
 ↓
Backend valide les credentials
 ↓
Retourne token + user
 ↓
localStorage['auth_token'] = token
 ↓
Redirige vers Home (connecté)
```

### Mot de passe oublié
```
SignInScreen (clic "Forgot?")
 ↓
ForgotPasswordScreen → saisit email
 ↓
handleSubmit() → auth.forgotPassword()
 ↓
Frontend POST /api/auth/forgot-password
 ↓
Backend génère resetToken
 ↓
Backend retourne resetToken (dev) ou l'envoie par email (prod)
 ↓
Affiche token pour copier
 ↓
Utilisateur clique "Continue to Reset Password"
 ↓
Redirige vers /reset-password?token=...
```

### Réinitialisation de mot de passe
```
ResetPasswordScreen (avec token en URL)
 ↓
Utilisateur saisit nouveau password
 ↓
handleSubmit() → auth.resetPassword()
 ↓
Frontend POST /api/auth/reset-password
 ↓
Backend vérifie token + hash le password
 ↓
Backend met à jour et supprime le token
 ↓
Affiche succès
 ↓
Redirige vers SignInScreen
```

### Vérification du token au démarrage
```
App lance → AuthProvider
 ↓
useEffect() dans AuthContext
 ↓
Récupère token from localStorage
 ↓
Vérifie si valid → POST /api/auth/verify-token
 ↓
Si valide → charge l'utilisateur
Si expiré → supprime le token
 ↓
setLoading(false)
```

## Comportement des redirections

### Utilisateurs non connectés
```
Si accède à / ou autre route (sauf auth routes)
→ Peut accéder librement (pas de redirection forcée)
→ Voir des boutons Sign In/Up dans Home
```

### Utilisateurs connectés
```
Si accède à /welcome, /signin, /signup
 ↓
AuthRoute.tsx → isAuthenticated === true
 ↓
Redirige vers / (Home)
```

### Cas particulier: Vu le Welcome ?
```
localStorage['seen_welcome'] === true
 ↓
Utilisateur peut accéder à Home directement
 ↓
Même s'il n'est pas connecté
```

## Variables d'environnement

```env
VITE_API_URL=http://localhost:5000/api
```

## Points importants

1. **localStorage**:
   - `auth_token`: Token JWT de l'utilisateur
   - `seen_welcome`: Boolean pour savoir si l'utilisateur a vu la première visite

2. **API URL**:
   - Frontend appelle `http://localhost:5000/api/auth/*`
   - Configuré via `VITE_API_URL` en `.env.local`

3. **État loading**:
   - Pendant la vérification du token au démarrage
   - Pendant les requêtes d'authentification
   - Les inputs sont désactivés pendant le chargement

4. **Gestion des erreurs**:
   - Affichage des erreurs l'utilisateur
   - Le token invalide est supprimé automatiquement

## Prochaines améliorations

1. ✅ Refresh token (prolonger session)
2. ✅ Recovery email (confirmation d'email)
3. ✅ 2FA (authentification en deux étapes)
4. ✅ Photo de profil
5. ✅ OAuth (Google, Apple, GitHub)
6. ✅ Sessions multiples
