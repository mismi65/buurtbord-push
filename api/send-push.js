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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { record } = req.body;

    // Haal het originele bericht op
    const { data: bericht } = await supabase
      .from('berichten')
      .select('*')
      .eq('id', record.bericht_id)
      .single();

    if (!bericht) {
      return res.status(200).json({ message: 'Bericht niet gevonden' });
    }

    // Haal FCM token op van de auteur van het bericht
    const { data: user } = await supabase
      .from('users')
      .select('fcm_token')
      .eq('naam', bericht.naam)
      .eq('huisnr', bericht.huisnr)
      .single();

    if (!user || !user.fcm_token) {
      return res.status(200).json({ message: 'Geen FCM token gevonden' });
    }

    // Stuur push notificatie
    await admin.messaging().send({
      token: user.fcm_token,
      notification: {
        title: '❤️ Interesse in jouw bericht!',
        body: `${record.naam} van nr. ${record.huisnr} is geïnteresseerd in: "${bericht.tekst}"`,
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Push fout:', error);
    return res.status(500).json({ error: error.message });
  }
};
