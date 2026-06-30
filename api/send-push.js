const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

// Firebase initialiseren
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendPushMetRetry(message, maxPogingen = 3) {
  let laatsteFout;
  for (let poging = 1; poging <= maxPogingen; poging++) {
    try {
      await admin.messaging().send(message);
      console.log(`Push gelukt op poging ${poging}`);
      return true;
    } catch (error) {
      laatsteFout = error;
      console.warn(`Poging ${poging} mislukt:`, error.message);

      // Alleen retryen bij de sporadische auth-error, niet bij ongeldige tokens
      const isRetryWaardig = error.message?.includes('Auth error from APNS or Web Push Service');
      if (!isRetryWaardig || poging === maxPogingen) {
        throw error;
      }

      // Korte, oplopende pauze tussen pogingen (1s, 2s)
      await wait(poging * 1000);
    }
  }
  throw laatsteFout;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { record } = req.body;

    const { data: bericht } = await supabase
      .from('berichten')
      .select('*')
      .eq('id', record.bericht_id)
      .single();

    if (!bericht) {
      return res.status(200).json({ message: 'Bericht niet gevonden' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('fcm_token')
      .eq('naam', bericht.naam)
      .eq('huisnr', bericht.huisnr)
      .single();

    if (!user || !user.fcm_token) {
      return res.status(200).json({ message: 'Geen FCM token gevonden' });
    }

    const message = {
      token: user.fcm_token,
      notification: {
        title: '❤️ Interesse in jouw bericht!',
        body: `${record.naam} van nr. ${record.huisnr} is geïnteresseerd in: "${bericht.tekst}"`,
      },
    };

    await sendPushMetRetry(message);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Push fout:', error);
    return res.status(500).json({ error: error.message });
  }
};
