# Outreach System — Setup Guide

## Stack (all free tiers)
- **Vercel** — hosting (Next.js)
- **Supabase** — PostgreSQL database
- **Upstash QStash** — email queue cron job
- **Resend** — email sending + reply detection

---

## Step 1: Supabase (Database)

1. Go to https://supabase.com → New project
2. Note your project password and project ref (in the URL: `app.supabase.com/project/[REF]`)
3. Go to **Settings → Database → Connection string → URI**
4. Copy the connection string — it looks like:
   ```
   postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
   ```

---

## Step 2: Resend (Email)

1. Log in to https://resend.com
2. Go to **API Keys** → Create key with "Sending access"
3. Note your `FROM_EMAIL` (must be a verified domain in Resend)
4. **For reply detection** (optional but recommended):
   - Go to **Inbound → Add domain** and add your domain
   - Set MX records as instructed, OR use `inbound.resend.dev` (no setup needed)
   - With `inbound.resend.dev`: replies go to `reply+{id}@inbound.resend.dev` automatically

---

## Step 3: Upstash QStash (Queue)

1. Go to https://console.upstash.com → QStash
2. Copy your **QSTASH_TOKEN**

---

## Step 4: Deploy to Vercel

1. Push this folder to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create outreach-system --public --push --source=.
   ```

2. Go to https://vercel.com → New Project → Import your repo

3. Add these environment variables in Vercel settings:
   ```
   DATABASE_URL          = postgresql://postgres:...@db....supabase.co:5432/postgres
   RESEND_API_KEY        = re_xxxxxxxxxxxx
   FROM_EMAIL            = you@yourdomain.com
   FROM_NAME             = Your Name
   INBOUND_DOMAIN        = inbound.resend.dev
   QSTASH_TOKEN          = your_qstash_token
   PROCESS_SECRET        = any-random-string-you-choose
   ```

4. Deploy!

---

## Step 5: Run Database Migration

After deploying, run locally (with the Supabase DATABASE_URL in your .env):
```bash
npx prisma db push
```

---

## Step 6: Register the Queue Cron (one-time)

After deployment, call this once to set up QStash to process your email queue every 15 minutes:

```bash
curl -X POST https://your-app.vercel.app/api/setup \
  -H "Content-Type: application/json" \
  -d '{"secret":"your-PROCESS_SECRET-value"}'
```

---

## Step 7: Set up Resend Webhooks

In Resend → Webhooks → Add endpoint:
- URL: `https://your-app.vercel.app/api/webhooks/resend`
- Events: `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`

For inbound replies:
- URL: `https://your-app.vercel.app/api/webhooks/inbound`
- (Configure in Resend → Inbound)

---

## Usage

1. **Import contacts** → Contacts page → Import CSV → map columns
2. **Build a sequence** → Sequences → New Sequence → add steps with delays
3. **Create campaign** → Campaigns → New Campaign → pick sequence
4. **Add contacts** → Campaign detail → Add Contacts → select → Launch

### Template variables
In your email subject/body, use:
- `{{name}}` — full name
- `{{first_name}}` — first name only
- `{{email}}` — email address
- `{{company}}` — company name
- Any custom field from your CSV (use the column header as the variable name)

### How sequences work
- Step 1 sends immediately on launch
- Step 2+ send after `delay_days` from previous step
- Queue processes every 15 minutes
- **If a contact replies → sequence stops automatically**
- Bounced/spam contacts are also stopped automatically

---

## Local Development

```bash
# Install dependencies
npm install

# Set up .env (copy .env.example and fill in values)
cp .env.example .env

# Push schema to database
npx prisma db push

# Start dev server
npm run dev
```

Open http://localhost:3000
