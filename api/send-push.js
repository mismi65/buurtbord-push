import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { berichtId, interesseNaam, interesseHuisnr, plaatserNaam, plaatserHuisnr } = req.body;

    console.log(`📬 Push request: ${interesseNaam} (nr. ${interesseHuisnr}) → ${plaatserNaam} (nr. ${plaatserHuisnr})`);

    // 1. Laad FCM token van plaatser uit Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('fcm_token')
      .eq('naam', plaatserNaam)
      .eq('huisnr', plaatserHuisnr)
      .single();

    if (userError || !userData?.fcm_token) {
      console.warn('❌ Geen FCM token voor plaatser:', plaatserNaam);
      return res.status(200).json({ 
        success: false, 
        reason: 'No FCM token for poster',
        debug: userError 
      });
    }

    const fcmToken = userData.fcm_token;
    console.log('✅ FCM token gevonden');

    // 2. Stuur push notification via Firebase
    const message = {
      notification: {
        title: 'Het Buurtbord 🏘️',
        body: `${interesseNaam} (nr. ${interesseHuisnr}) heeft interesse getoond!`
      },
      webpush: {
        fcmOptions: {
          link: 'https://buurtbord.pages.dev'
        }
      },
      token: fcmToken
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Push notification verstuurd:', response);

    return res.status(200).json({
      success: true,
      messageId: response,
      recipient: `${plaatserNaam} (nr. ${plaatserHuisnr})`
    });

  } catch (error) {
    console.error('❌ Push error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString()
    });
  }
}
