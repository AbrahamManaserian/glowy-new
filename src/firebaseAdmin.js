import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing Firebase Admin SDK credentials. Please check your .env.local file.');
    if (!projectId) console.error('   Missing: FIREBASE_PROJECT_ID');
    if (!clientEmail) console.error('   Missing: FIREBASE_CLIENT_EMAIL');
    if (!privateKey) console.error('   Missing: FIREBASE_PRIVATE_KEY');
  } else {
    try {
      // Basic validation check for private key format
      if (!privateKey.includes('BEGIN PRIVATE KEY')) {
        console.warn(
          '⚠️ FIREBASE_PRIVATE_KEY does not look like a valid private key. It should start with "-----BEGIN PRIVATE KEY-----"',
        );
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('❌ Firebase admin initialization error:', error);
    }
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth };
