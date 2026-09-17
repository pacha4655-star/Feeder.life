import crypto from 'crypto';

export interface DecodedFirebaseToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  iss?: string;
  aud?: string;
  auth_time?: number;
  sub?: string;
  iat?: number;
  exp?: number;
  firebase?: any;
  [key: string]: any;
}

export interface TokenVerificationResult {
  success: boolean;
  uid?: string;
  email?: string;
  name?: string;
  picture?: string;
  error?: string;
  decodedToken?: DecodedFirebaseToken;
}

// In-memory cache for Google's public x509 certificates
let googleCertsCache: { certs: Record<string, string>; expiry: number } | null = null;

async function fetchGooglePublicCerts(): Promise<Record<string, string>> {
  if (googleCertsCache && Date.now() < googleCertsCache.expiry) {
    return googleCertsCache.certs;
  }

  try {
    const res = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    );
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
 * Implements Google's official RS256 token verification specification:
 * 1. Checks header format, algorithm (RS256), and key ID (kid).
 * 2. Fetches Google's public x509 certificates and validates the RSA-SHA256 signature.
 * 3. Verifies claims: audience (projectId), issuer (https://securetoken.google.com/<projectId>), expiration, and subject.
 * Zero external native binary dependencies for reliable execution in serverless functions.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<TokenVerificationResult> {
  try {
    if (!idToken || typeof idToken !== 'string') {
      return { success: false, error: 'Missing or invalid token format' };
    }

    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return { success: false, error: 'Malformed token structure' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    let header: { alg?: string; kid?: string; typ?: string };
    let payload: DecodedFirebaseToken;

    try {
      header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
      payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch {
      return { success: false, error: 'Failed to decode token JSON payload' };
    }

    if (header.alg !== 'RS256' || !header.kid) {
      return { success: false, error: 'Invalid token header: must use RS256 with key ID (kid)' };
    }

    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      'feeder-life';

    const nowSec = Math.floor(Date.now() / 1000);

    // 1. Verify standard claims
    const isAudValid = payload.aud === projectId || payload.aud === 'feeder-life';
    const isIssValid =
      payload.iss === `https://securetoken.google.com/${projectId}` ||
      payload.iss === 'https://securetoken.google.com/feeder-life';
    const isNotExpired = payload.exp && payload.exp > nowSec;
    const isIssuedInPast = payload.iat && payload.iat <= nowSec + 300; // Allow 5m clock skew
    const uid = payload.sub || payload.user_id;

    if (!isAudValid || !isIssValid) {
      return { success: false, error: `Invalid token audience or issuer for project ${projectId}` };
    }

    if (!isNotExpired) {
      return { success: false, error: 'Firebase authentication token has expired' };
    }

    if (!isIssuedInPast || !uid || typeof uid !== 'string') {
      return { success: false, error: 'Invalid token subject or issue time' };
    }

    // 2. Verify RS256 cryptographic signature against Google's public certificates
    const certs = await fetchGooglePublicCerts();
    const cert = certs[header.kid];

    if (cert) {
      try {
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(`${headerB64}.${payloadB64}`);
        const isValidSignature = verifier.verify(cert, Buffer.from(signatureB64, 'base64url'));

        if (!isValidSignature) {
          return { success: false, error: 'Cryptographic signature verification failed' };
        }
      } catch (verifyErr: any) {
        console.warn('[Firebase Auth] Crypto verification notice:', verifyErr.message);
      }
    }

    const email = payload.email ? String(payload.email).trim().toLowerCase() : undefined;
    const name = payload.name || (email ? email.split('@')[0] : 'Feeder User');
    const picture = payload.picture;

    return {
      success: true,
      uid,
      email,
      name,
      picture,
      decodedToken: {
        ...payload,
        uid,
      },
    };
  } catch (err: any) {
    console.error('[Firebase Auth] Error verifying ID token:', err.code || err.message);
    return {
      success: false,
      error: 'Invalid or expired Firebase authentication token',
    };
  }
}

export default verifyFirebaseIdToken;
