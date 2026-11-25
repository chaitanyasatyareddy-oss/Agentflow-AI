import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { App, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedUser;
}

const ADMIN_EMAIL = 'chaitanyasatyareddy@gmail.com';

let cachedAdminApp: App | null = null;
let cachedProjectId: string | null = null;

function resolveFirebaseProjectId(): string | null {
  if (cachedProjectId) return cachedProjectId;
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return null;
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as { projectId?: string };
    const projectId = parsed.projectId?.trim();
    if (!projectId || projectId === 'remixed-project-id') return null;
    cachedProjectId = projectId;
    return projectId;
  } catch {
    return null;
  }
}

function getFirebaseAdminApp(): App | null {
  if (cachedAdminApp) return cachedAdminApp;
  const projectId = resolveFirebaseProjectId();
  if (!projectId) return null;

  cachedAdminApp = getApps().length > 0 ? getApp() : initializeApp({ projectId });
  return cachedAdminApp;
}

export function isFirebaseAuthConfigured(): boolean {
  return Boolean(resolveFirebaseProjectId());
}

export async function requireFirebaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const adminApp = getFirebaseAdminApp();
  if (!adminApp) {
    res.status(503).json({ error: 'Firebase authentication is not configured on the server.' });
    return;
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Invalid authorization token.' });
    return;
  }

  try {
    const decoded = await getAuth(adminApp).verifyIdToken(token);
    if (!decoded.email_verified) {
      res.status(403).json({ error: 'Verified email account is required.' });
      return;
    }

    const email = (decoded.email || '').toLowerCase();
    req.authUser = {
      uid: decoded.uid,
      email,
      isAdmin: email === ADMIN_EMAIL,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
}
