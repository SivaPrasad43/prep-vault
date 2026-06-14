export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface AuthState {
  user: UserProfile | null;
  session: unknown | null;
  loading: boolean;
}
