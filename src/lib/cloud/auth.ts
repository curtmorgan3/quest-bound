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

export async function signIn(
  email: string,
  password: string,
): Promise<{ user: CloudUser; session: CloudSession } | { error: Error }> {
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

const REGISTER_EMAIL_URL = 'https://api.questbound.com/register-email';

/** Registers the given email with the Quest Bound backend. */
export async function registerEmail(email: string): Promise<{ error?: Error }> {
  const trimmed = email?.trim();
  if (!trimmed) return { error: new Error('Email is required') };
  try {
    const response = await fetch(REGISTER_EMAIL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed }),
    });
    if (!response.ok) {
      return { error: new Error(`Failed to register email: ${response.statusText}`) };
    }
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e : new Error('Failed to register email') };
  }
}

/** True when the cloud user's email is verified (e.g. Supabase email_confirmed_at). */
export function isCloudEmailVerified(user: CloudUser): boolean {
  return Boolean(
    (user as unknown as { email_confirmed_at?: string | null }).email_confirmed_at,
  );
}

export type LocalUserForEmail = {
  id: string;
  emailVerified?: boolean | null;
};

/**
 * When the session user has a verified email and the local user has emailVerified false,
 * calls registerEmail then updates the local user's email and emailVerified.
 */
export async function ensureEmailRegistered(
  cloudUser: CloudUser,
  getLocalUser: () => Promise<LocalUserForEmail | null>,
  updateLocalUser: (
    id: string,
    updates: { email?: string; emailVerified: boolean },
  ) => Promise<void>,
): Promise<void> {
  if (!cloudUser.email || !isCloudEmailVerified(cloudUser)) return;
  const local = await getLocalUser();
  if (!local || local.emailVerified) return;
  const result = await registerEmail(cloudUser.email);
  if (result.error) return;
  await updateLocalUser(local.id, {
    email: cloudUser.email,
    emailVerified: true,
  });
}
