import type { Session, User } from '@supabase/supabase-js';
import { cloudClient } from './client';

export type CloudUser = User;
export type CloudSession = Session;

export type SignUpResult =
  | { user: CloudUser; session: CloudSession }
  | { needsEmailVerification: true }
  | { error: Error };

export async function signUp(email: string, password: string): Promise<SignUpResult> {
  if (!cloudClient) {
    return { error: new Error('Cloud is not configured') };
  }
  const { data, error } = await cloudClient.auth.signUp({ email, password });
  if (error) return { error };
  if (!data.user) return { error: new Error('Sign up failed') };
  // Email confirmation required: Supabase returns user but no session until verified
  if (!data.session) return { needsEmailVerification: true };
  return { user: data.user, session: data.session };
}

export async function signIn(email: string, password: string): Promise<{ user: CloudUser; session: CloudSession } | { error: Error }> {
  if (!cloudClient) {
    return { error: new Error('Cloud is not configured') };
  }
  const { data, error } = await cloudClient.auth.signInWithPassword({ email, password });
  if (error) return { error };
  if (!data.user || !data.session) return { error: new Error('No session returned') };
  return { user: data.user, session: data.session };
}

export async function signOut(): Promise<void> {
  if (cloudClient) {
    await cloudClient.auth.signOut();
  }
}

export async function getSession(): Promise<CloudSession | null> {
  if (!cloudClient) return null;
  const { data } = await cloudClient.auth.getSession();
  return data.session;
}

export type AuthChangeCallback = (event: string, session: CloudSession | null) => void;

export function onAuthStateChange(callback: AuthChangeCallback): () => void {
  if (!cloudClient) return () => {};
  const {
    data: { subscription },
  } = cloudClient.auth.onAuthStateChange((_event, session) => {
    callback(_event, session);
  });
  return () => subscription.unsubscribe();
}

export async function updatePassword(newPassword: string): Promise<{ error: Error | null }> {
  if (!cloudClient) {
    return { error: new Error('Cloud is not configured') };
  }
  const { error } = await cloudClient.auth.updateUser({ password: newPassword });
  return { error: error ?? null };
}
