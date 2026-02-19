# RCH Deal Analyzer — Deploy Guide

## Color Scheme

The Red Cedar Platform features a sophisticated **dark theme** with **warm cedar brown accents**. For complete color palette documentation, design guidelines, and usage patterns, see [COLOR_SCHEME.md](./COLOR_SCHEME.md).

**Quick Reference:**
- **Primary Brand Color**: Cedar (#8b6a4f - warm brown inspired by red cedar wood)
- **Background**: Slate-950 (deep blue-tinted black)
- **Text**: Slate-100 (off-white)
- **Fonts**: DM Serif Display (headings), DM Sans (body), JetBrains Mono (numbers/data)

---

## Architecture

```
Browser → Next.js (Vercel) → Supabase (opuykuydejpicqdtekne)
                            → Claude API (memo generation, future)
```

The app runs the underwriting calculations client-side in the browser using the same
engine as the Claude skill. Results are saved to Supabase. The Claude skill in your
skill library remains the source of truth for how Claude runs analyses in chat — this
dashboard is a parallel interface using the same math.

---

## Step 1: Run the SQL Migration

1. Go to https://supabase.com/dashboard/project/hcneetymvattlgbgarbg
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Paste the entire contents of `supabase/migration.sql`
5. Click **Run**
6. You should see the tables created: `sl_deals`, `sl_deal_results`, `sl_deal_comps`
7. Verify in **Table Editor** that all three tables appear

## Step 2: Get Your Supabase Keys

1. In your Supabase dashboard, go to **Settings > API**
2. Copy these two values:
   - **anon / public** key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → this is `SUPABASE_SERVICE_ROLE_KEY`
3. Your project URL is: `https://opuykuydejpicqdtekne.supabase.co`

## Step 3: Create a Supabase Auth User

1. In your Supabase dashboard, go to **Authentication > Users**
2. Click **Add User > Create New User**
3. Enter your email and a password
4. This will be your login for the dashboard

## Step 4: Push to GitHub

```bash
cd rch-deal-analyzer
git init
git add .
git commit -m "Initial commit: RCH Deal Analyzer"
git remote add origin https://github.com/YOUR_USERNAME/rch-deal-analyzer.git
git push -u origin main
```

## Step 5: Deploy to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repo (`rch-deal-analyzer`)
3. Framework Preset: **Next.js** (should auto-detect)
4. **Environment Variables** — add these:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hcneetymvattlgbgarbg.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key (already in .env.local.example) |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key from Step 2 |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (for future memo gen) |

5. Click **Deploy**
6. Once deployed, Vercel gives you a URL like `rch-deal-analyzer.vercel.app`

## Step 6: Configure Supabase Auth Redirect

1. In Supabase dashboard, go to **Authentication > URL Configuration**
2. Set **Site URL** to your Vercel URL (e.g., `https://rch-deal-analyzer.vercel.app`)
3. Add to **Redirect URLs**: `https://rch-deal-analyzer.vercel.app/**`

## Step 7: Test

1. Visit your Vercel URL
2. Log in with the user you created in Step 3
3. Click **+ New Deal**
4. Fill in a deal (e.g., 378 Copper Creek Cir, $85K lot, CHERRY plan, $475K ASP)
5. Click **Preview Results** to see the live calculation
6. Click **Save Deal** to write to Supabase
7. Go back to the dashboard to see your portfolio view

---

## Custom Domain (Optional)

1. In Vercel, go to your project **Settings > Domains**
2. Add your domain (e.g., `deals.redcedarhomes.com`)
3. Update DNS with the CNAME Vercel provides
4. Update Supabase Auth URL Configuration to match

---

## Updating the Skill

Changes to the Claude skill in your skill library (SKILL.md, reference files) affect
how Claude runs analyses in chat. They do NOT automatically change the dashboard
calculations. To sync:

1. If you change **fee amounts** (builder fee, contingency, etc.), update the
   DEFAULTS object in `app/deal/new/page.tsx`
2. If you add **new floor plans**, add them to `lib/floor-plans.ts`
3. If you change the **calculation logic**, update `lib/underwrite.ts`
4. Push to GitHub → Vercel auto-deploys

The skill and dashboard share the same math but are independently versioned. This is
intentional — it lets you test skill changes in Claude chat before rolling them into
the production dashboard.

---

## File Structure

```
rch-deal-analyzer/
  app/
    layout.tsx              # Root layout, fonts, body
    globals.css             # Tailwind + custom styles
    page.tsx                # Landing page with SL / BTR module cards
    login/
      page.tsx              # Auth login/signup
    sl/                     # SL DEAL ANALYZER MODULE
      page.tsx              # SL portfolio dashboard
      deal/
        new/page.tsx        # New scattered lot deal form
        [id]/page.tsx       # Deal detail view
    btr/                    # RCC BTR PROFORMA MODULE
      page.tsx              # BTR pipeline dashboard
      project/
        new/page.tsx        # New BTR project creation
        [id]/page.tsx       # Project detail view
  components/
    TopNav.tsx              # Shared navigation with SL/BTR switcher
  lib/
    supabase.ts             # Supabase client helpers
    underwrite.ts           # SL calculation engine
    format.ts               # Number/color formatting
    floor-plans.ts          # Floor plan database
  supabase/
    migration.sql           # SL schema (sl_deals, sl_deal_results, sl_deal_comps)
    btr_migration.sql       # BTR schema (20 btr_ tables)
  middleware.ts             # Auth route protection
```
