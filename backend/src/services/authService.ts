// AuthService is now handled by Supabase Auth.
// This module is kept for backward compatibility — only utility helpers remain.

export class AuthService {
  static generateUserId(): string {
    return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}
