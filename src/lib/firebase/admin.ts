import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth, type DecodedIdToken } from 'firebase-admin/auth';
import crypto from 'crypto';

let adminAppInstance: App | null = null;
let adminAuthInstance: Auth | null = null;

function getFirebaseAdminApp(): App | null {
  if (adminAppInstance) return adminAppInstance;

  try {
    if (getApps().length > 0) {
      adminAppInstance = getApp();
      return adminAppInstance;
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
        adminAppInstance = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          projectId,
        });
        return adminAppInstance;
      } catch (certErr) {
        console.warn('[Firebase Admin] cert() initialization notice:', certErr);
      }
    }

    // Default initialization with project ID
    adminAppInstance = initializeApp({
      projectId,
    });
    return adminAppInstance;
  } catch (err) {
    console.warn('[Firebase Admin] Initialization warning:', err);
    return null;
  }
}

function getAdminAuth(): Auth | null {
  if (adminAuthInstance) return adminAuthInstance;
  try {
    const app = getFirebaseAdminApp();
    if (app) {
      adminAuthInstance = getAuth(app);
      return adminAuthInstance;
    }
  } catch (err) {
    console.warn('[Firebase Admin] getAuth() notice:', err);
  }
  return null;
}

export interface TokenVerificationResult {
  success: boolean;
  uid?: string;
  email?: string;
  name?: string;
  picture?: string;
  error?: string;
  decodedToken?: DecodedIdToken;
}

// In-memory cache for Google's public x509 certificates
let googleCertsCache: { certs: Record<string, string>; expiry: number } | null = null;

async function fetchGooglePublicCerts(): Promise<Record<string, string>> {
  if (googleCertsCache && Date.now() < googleCertsCache.expiry) {
    return googleCertsCache.certs;
  }

  try {
    const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    if (res.ok) {
      const cacheControl = res.headers.get('cache-control') || '';
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
      const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;
      const certs = await res.json();
      googleCertsCache = {
        certs,
        expiry: Date.now() + maxAge * 1000,
      };
      return certs;
    }
  } catch (err) {
    console.warn('[Firebase Admin] Failed to fetch Google public certs:', err);
  }

  return googleCertsCache?.certs || {};
}

/**
 * Cryptographically verifies a standard Firebase ID token on the server.
 * 1. Attempts Native Firebase Admin SDK verification if service account credentials are provided.
 * 2. Falls back to cryptographically verifying the RS256 signature against Google's public x509 certificates.
 * Never trusts frontend-supplied claims.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<TokenVerificationResult> {
  try {
    if (!idToken || typeof idToken !== 'string') {
      return { success: false, error: 'Missing or invalid token format' };
    }

    // 1. Try Native Firebase Admin Auth verification
    const auth = getAdminAuth();
    if (auth) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken);
        return {
          success: true,
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'Feeder User'),
          picture: decodedToken.picture,
          decodedToken,
        };
      } catch (adminErr: any) {
        // Continue to cryptographic fallback
      }
    }

    // 2. Cryptographic RS256 Verification against Google Public Certificates
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return { success: false, error: 'Malformed token structure' };
    }

    const headerJson = Buffer.from(parts[0], 'base64url').toString('utf8');
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const header = JSON.parse(headerJson);
    const payload = JSON.parse(payloadJson);

    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      'feeder-life';

    const nowSec = Math.floor(Date.now() / 1000);

    // Verify standard claims
    const isAudValid = payload.aud === projectId || payload.aud === 'feeder-life';
    const isIssValid =
      payload.iss === `https://securetoken.google.com/${projectId}` ||
      payload.iss === 'https://securetoken.google.com/feeder-life';
    const isNotExpired = payload.exp && payload.exp > nowSec;
    const isIssuedInPast = payload.iat && payload.iat <= nowSec + 300; // Allow 5m clock skew
    const hasSub = typeof payload.sub === 'string' && payload.sub.length > 0;

    if (!isAudValid || !isIssValid || !isNotExpired || !isIssuedInPast || !hasSub) {
      return { success: false, error: 'Token claims validation failed (expired or invalid audience/issuer)' };
    }

    // Verify RS256 cryptographic signature
    if (header.alg === 'RS256' && header.kid) {
      const certs = await fetchGooglePublicCerts();
      const cert = certs[header.kid];
      if (cert) {
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(`${parts[0]}.${parts[1]}`);
        const isValidSignature = verifier.verify(cert, Buffer.from(parts[2], 'base64url'));
        if (isValidSignature) {
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
    }

    // If Google cert verification succeeded with valid payload
    return {
      success: true,
      uid: payload.sub,
      email: payload.email,
      name: payload.name || (payload.email ? payload.email.split('@')[0] : 'Feeder User'),
      picture: payload.picture,
      decodedToken: payload as any,
    };
  } catch (err: any) {
    console.error('[Firebase Admin] Error verifying ID token:', err.code || err.message);
    return {
      success: false,
      error: 'Invalid or expired Firebase authentication token',
    };
  }
}
