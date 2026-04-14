# ✅ Checklist de test - Dealss Authentication Flow

## 🧪 Tests manuels

### 1. Démarrage de l'application

- [ ] Lancez l'app avec `start.cmd` ou `start.sh`
- [ ] Backend démarre sur `http://localhost:5000`
- [ ] Frontend démarre sur `http://localhost:5173`
- [ ] Page se charge sans erreurs

### 2. Welcome Screen

- [ ] Welcome screen s'affiche à la première visite
- [ ] Logo Dealss visible avec gradient verde
- [ ] 3 boutons visibles: "Create Account", "Sign In", "Continue as Guest"
- [ ] Features affichées: Hot Deals, Community, Trusted

#### Actions
- [ ] Clic "Continue as Guest" → redirige à Home
- [ ] Clic "Create Account" → redirige à SignUp
- [ ] Clic "Sign In" → redirige à SignIn

### 3. Sign Up Flow

#### Écran SignUp
- [ ] Formulaire avec 4 champs: Name, Email, Password, Confirm Password
- [ ] Icônes dans les champs
- [ ] Eye toggle pour password
- [ ] "Terms of Service" links visibles
- [ ] Lien "Already have an account? Sign In"

#### Validation
- [ ] Name vide → erreur
- [ ] Email vide → erreur
- [ ] Email format invalide → erreur
- [ ] Password < 6 caractères → erreur "At least 6 characters"
- [ ] Password ≠ Confirm → erreur "Passwords do not match"

#### Soumission réussie
- [ ] Clic "Create Account"
- [ ] Bouton affiche "Creating Account..."
- [ ] Appel POST /api/auth/signup réussi
- [ ] localStorage['auth_token'] sauvegardé
- [ ] localStorage['seen_welcome'] = true
- [ ] Redirige automatiquement à Home
- [ ] Utilisateur connecté dans l'app

#### Erreurs backend
- [ ] Email déjà utilisé → "Email already registered"
- [ ] Serveur down → affiche erreur appropriée

### 4. Sign In Flow

#### Écran SignIn
- [ ] Formulaire avec 2 champs: Email, Password
- [ ] Lien "Forgot?" sous Password label
- [ ] Eye toggle pour password
- [ ] Lien "Don't have an account? Sign Up"

#### Validation
- [ ] Email vide → erreur
- [ ] Password vide → erreur

#### Soumission réussie
- [ ] Clic "Sign In"
- [ ] Bouton affiche "Signing In..."
- [ ] Appel POST /api/auth/signin réussi
- [ ] localStorage['auth_token'] sauvegardé
- [ ] localStorage['seen_welcome'] = true
- [ ] Redirige automatiquement à Home
- [ ] Utilisateur connecté

#### Erreurs
- [ ] Email invalide → "Invalid email or password"
- [ ] Password faux → "Invalid email or password"
- [ ] Compte n'existe pas → "Invalid email or password"

### 5. Forgot Password Flow

#### Écran ForgotPassword
- [ ] Accessible via SignIn → "Forgot?" link
- [ ] Formulaire avec 1 champ: Email
- [ ] Description explique le processus

#### Soumission
- [ ] Saisir email existant
- [ ] Clic "Send Reset Link"
- [ ] Appel POST /api/auth/forgot-password réussi
- [ ] Affiche screen avec token
- [ ] Token copié dans clipboard quand on clique "Copy Token"
- [ ] "Continue to Reset Password" button affichée

#### Erreurs
- [ ] Email vide → erreur "Email is required"
- [ ] Email inexistant → affiche success (sécurité)

### 6. Reset Password Flow

#### Écran ResetPassword (via URL avec token)
- [ ] URL: `/reset-password?token=...`
- [ ] Formulaire avec 2 champs: Password, Confirm Password
- [ ] Eye toggles pour les 2 fields

#### Validation
- [ ] Password < 6 caractères → erreur
- [ ] Password ≠ Confirm → erreur

#### Soumission réussie
- [ ] Clic "Reset Password"
- [ ] Bouton affiche "Resetting..."
- [ ] Appel POST /api/auth/reset-password réussi
- [ ] Affiche check mark + "Password Reset!"
- [ ] Redirige automatiquement à SignIn après 2 secondes
- [ ] Peut se connecter avec nouveau password

#### Erreurs
- [ ] Token invalide → "Invalid or expired reset token"
- [ ] Token expiré → "Invalid or expired reset token"

### 7. Home Screen (page de garde)

#### Non connecté
- [ ] Peut accéder à Home sans token
- [ ] Offres affichées
- [ ] Buttons Sign In/Up accessibles
- [ ] Peut rechercher et navigator l'app
- [ ] Profile button redirige vers SignIn si pas connecté

#### Connecté
- [ ] Home affiche avec user info
- [ ] Peut accéder à Profile
- [ ] Bouton Logout disponible
- [ ] Offres personnalisées (si implémenté)

### 8. Session Persistence

#### Fermer et rouvrir le navigateur
- [ ] localStorage['auth_token'] persiste
- [ ] localStorage['seen_welcome'] persiste
- [ ] App redémarre et recharge l'user
- [ ] Utilisateur reste connecté

#### Token valide
- [ ] App lance → AuthContext appelle verify-token
- [ ] Backend validation réussit
- [ ] User info rechargé dans l'app
- [ ] État de loading affiché pendant init

#### Token expiré/invalide
- [ ] App lance avec ancien token
- [ ] Backend retourne 401
- [ ] Token supprimé vom localStorage
- [ ] Utilisateur redirigé à Welcome

### 9. ProtectedRoute Behavior

#### Utilisateurs authentifiés
- [ ] Accès à /welcome → Redirige à /
- [ ] Accès à /signin → Redirige à /
- [ ] Accès à /signup → Redirige à /
- [ ] Accès à / → Pas de redirection

#### Utilisateurs non authentifiés
- [ ] Accès à / → Pas de redirection (mode guest)
- [ ] Accès à /welcome → Pas de redirection
- [ ] Accès à /signin → Pas de redirection
- [ ] Accès à /signup → Pas de redirection

### 10. Error Handling

#### Network errors
- [ ] Backend down → affiche message d'erreur
- [ ] Mauvais CORS → affiche erreur appropriée
- [ ] Timeout → affiche message au user

#### Form validation
- [ ] Tous les champs affichent les erreurs en rouge
- [ ] Messages d'erreur descriptifs
- [ ] Erreur disparaît sur input change

### 11. UX & Design

#### Visual feedback
- [ ] Loading states avec texte changé ("Creating Account...")
- [ ] Disabled inputs pendant la soumission
- [ ] Error messages en rouge avec icône
- [ ] Success messages en vert avec animation

#### Responsiveness
- [ ] Tous les écrans responsive sur mobile
- [ ] Forms bien espacés
- [ ] Boutons faciles à cliquer
- [ ] Texte lisible

#### Animations
- [ ] Welcome screen: animations smooth de titre/icons
- [ ] Form screens: animations fade-in
- [ ] Transitions entre pages smooth

## 🔍 Tests d'API

### Signup Endpoint
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "confirmPassword": "password123",
    "name": "Test User"
  }'
```

Expected: 201 avec user + token

### Signin Endpoint
```bash
curl -X POST http://localhost:5000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Expected: 200 avec user + token

### Verify Token
```bash
curl -X POST http://localhost:5000/api/auth/verify-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN_HERE"
  }'
```

Expected: 200 avec user if valid, 401 if invalid

## 📋 Checklist finale

### Code Quality
- [ ] Pas d'erreurs TypeScript
- [ ] Pas de console.log() dépannage laissés
- [ ] Imports supprimés inutilisés
- [ ] Code formaté proprement

### Security
- [ ] Passwords jamais loggés
- [ ] Tokens handled correctement
- [ ] CORS configuré
- [ ] Validation côté serveur
- [ ] Validation côté client

### Performance
- [ ] App charge rapidement
- [ ] Pas de memory leaks
- [ ] Pas de flashing/flickering
- [ ] Images optimized

### Documentation
- [ ] AUTH_FLOW.md complet
- [ ] AUTHENTICATION.md complet
- [ ] README backend présent
- [ ] Code commenté si complexe

## 🐛 Bugs connus / À fixer

- [ ] Email recovery encore à implémenter (envoi d'email)
- [ ] Refresh tokens pas encore implémentés
- [ ] Base de données réelle pas encore connectée
- [ ] Rate limiting pas implémenté

## ✨ Prochaines features

- [ ] OAuth login
- [ ] 2FA
- [ ] Account recovery options
- [ ] Session management UI
- [ ] Social sharing
