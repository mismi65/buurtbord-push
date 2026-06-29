# Het Buurtbord — Push Notification Backend

Serverless function die push notifications stuurt via Firebase Cloud Messaging.

## Setup

### 1. GitHub Repository
```bash
git clone https://github.com/mismi65/buurtbord-push
cd buurtbord-push
```

### 2. Environment Variables (Vercel)

**Settings → Environment Variables:**

- `FIREBASE_SERVICE_ACCOUNT` — Volledige JSON van Firebase service account key
- `SUPABASE_URL` — https://zfbahltilsexlzlqdyxs.supabase.co
- `SUPABASE_KEY` — sb_publishable_mufq7USEGM7n9QDYWeUrOw_xd9eoMy8

### 3. Deploy

```bash
vercel --prod
```

## API Endpoint

**POST** `/api/send-push`

**Body:**
```json
{
  "berichtId": "uuid-van-bericht",
  "interesseNaam": "mike",
  "interesseHuisnr": "27",
  "plaatserNaam": "sanne",
  "plaatserHuisnr": "14"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "...",
  "recipient": "sanne (nr. 14)"
}
```

## Flow

1. User drukt ❤️ op bericht
2. `addInteresse()` slaat interest op in Supabase
3. **Supabase Webhook** triggert op `interesses` INSERT
4. Webhook POST naar `/api/send-push`
5. Function laadt FCM token van plaatser
6. Firebase stuurt push notification
7. Plaatser ontvangt notificatie! 🔔

## Debugging

Check **Vercel → Logs** voor errors.

Firebase SDK errors? Check `FIREBASE_SERVICE_ACCOUNT` format (moet volledige JSON zijn).
