import { NextResponse } from 'next/server';
import { adminDb } from '@/firebaseAdmin';

export async function POST(request) {
  try {
    const { uid, email, displayName, photoURL, provider } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'Missing UID' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      // User exists, return their profile
      return NextResponse.json({
        success: true,
        user: userDoc.data(),
      });
    }

    // User does not exist, create new verified document
    const newUser = {
      uid,
      email: email || '',
      fullName: displayName || '',
      photoURL: photoURL || '',
      provider: provider || 'unknown',
      role: 'customer', // Secure default
      firstShop: true, // Secure default
      createdAt: new Date(),
    };

    await userRef.set(newUser);

    return NextResponse.json({
      success: true,
      user: newUser,
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
