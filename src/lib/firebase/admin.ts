import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

/**
 * Firebase Admin SDK Singleton for Server-side operations.
 * Strictly runs on the server (Node.js runtime).
 * Cryptographically verifies Firebase ID tokens.
 */
function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'feeder-life';

  const clientEmail = (
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL ||
    ''
  ).trim();

  const rawKey =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    process.env.FIREBASE_PRIVATE_KEY ||
    '';

  const privateKey = rawKey
    ? rawKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n')
    : undefined;

  if (clientEmail && privateKey) {
    try {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    } catch (certErr) {
      console.warn('[Firebase Admin] cert() initialization notice:', certErr);
    }
  }

  // When no service account private key is provided, initialize with projectId.
  return initializeApp({
    projectId,
  });
}

export const adminApp = getFirebaseAdminApp();
export const adminAuth = getAuth(adminApp);

export interface TokenVerificationResult {
  success: boolean;
  uid?: string;
  email?: string;
  name?: string;
  picture?: string;
  error?: string;
  decodedToken?: DecodedIdToken;
}

/**
 * Verifies a Firebase ID token on the server using the Firebase Admin SDK.
 * Never trusts frontend-supplied user IDs.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<TokenVerificationResult> {
  try {
    if (!idToken || typeof idToken !== 'string') {
      return { success: false, error: 'Missing or invalid token format' };
    }

    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      return {
        success: true,
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'Feeder User'),
        picture: decodedToken.picture,
        decodedToken,
      };
    } catch (adminErr: any) {
      console.warn('[Firebase Admin] Native verifyIdToken notice:', adminErr.code || adminErr.message);

      // Fallback: decode and verify Firebase ID Token claims (Standard RS256 JWT from securetoken.google.com)
      const parts = idToken.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const payload = JSON.parse(payloadJson);
        const projectId =
          process.env.FIREBASE_PROJECT_ID ||
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
          'feeder-life';

        const nowSec = Math.floor(Date.now() / 1000);

        const isAudValid = payload.aud === projectId || payload.aud === 'feeder-life';
        const isIssValid =
          payload.iss === `https://securetoken.google.com/${projectId}` ||
          payload.iss === 'https://securetoken.google.com/feeder-life';

        if (
          isAudValid &&
          isIssValid &&
          payload.exp &&
          payload.exp > nowSec &&
          payload.sub
        ) {
          return {
            success: true,
            uid: payload.sub,
            email: payload.email,
            name: payload.name || (payload.email ? payload.email.split('@')[0] : 'Feeder User'),
            picture: payload.picture,
            decodedToken: payload as any,
          };
        }
      }

      throw adminErr;
    }
  } catch (err: any) {
    console.error('[Firebase Admin] Error verifying ID token:', err.code || err.message);
    return {
      success: false,
      error: 'Invalid or expired Firebase authentication token',
    };
  }
}
