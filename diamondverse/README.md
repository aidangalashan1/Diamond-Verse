# DiamondVerse Manager

A full-stack PWS (Pro Wrestling Simulator) modding database manager. Built with React + Vite frontend, Supabase backend, deployed on Netlify.

---

## 🚀 Setup Guide

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the **SQL Editor**, paste and run the full contents of `supabase_schema.sql`
3. In **Storage**, create these public buckets:
   - `workers`
   - `companies`
   - `titles`
   - `tag-teams`
   - `stables`
   - `events`
4. Set each bucket's policy to **Public** (allow all reads)
5. Copy your **Project URL** and **anon public key** from Project Settings → API

### 2. Local Development

```bash
# Clone/download the project
cd diamondverse

# Install dependencies
npm install

# Create .env file from template
cp .env.example .env

# Fill in your Supabase credentials in .env:
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJh...

# Start dev server
npm run dev
```

### 3. Deploy to Netlify

**Option A — Netlify UI:**
1. Push this project to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → New Site → Import from Git
3. Set **Build command**: `npm run build`
4. Set **Publish directory**: `dist`
5. Under **Environment variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
6. Deploy!

**Option B — Netlify CLI:**
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify env:set VITE_SUPABASE_URL "your_url"
netlify env:set VITE_SUPABASE_ANON_KEY "your_key"
netlify deploy --prod --build
```

---

## 🔐 Login

Password: `DrakeDiamond2026`

---

## 📥 CSV Import

The app supports importing your workers CSV. The importer maps these columns automatically:

| CSV Column | DB Field |
|---|---|
| Name | name |
| Age | (calculated from DOB if provided) |
| Bio | bio |
| Gender | gender |
| Height | height_ft + height_in |
| Intimidation | intimidation |
| Looks | looks |
| Push | push (mapped: "Main Eventer" → "Main Event", etc.) |
| Build | build |
| Star Quality | star_quality |
| Weight (lbs) | weight_lbs |
| Ethnicity | ethnicity |

Go to **Workers → Import CSV** and select your file.

---

## ✨ Key Features

### Workers
- Full table with inline cell editing (click any cell to edit)
- Multi-level sort (hold sort state across multiple fields)
- Multi-field filter panel with active filter tags
- Bulk select + bulk field edit across any number of workers
- Card view and table view toggle
- Mini inline add-row at the bottom of the table
- CSV import from PWS-style exports
- Multi-add: Fast mode (names only) or Full mode (paste from spreadsheet)
- Profile picture in table rows
- Age auto-calculated from DOB vs reference date
- Random DOB generator button
- Height rollover (5'11" + 1 = 6'0")
- Weight category labels with color coding
- Attribute sliders + manual number inputs
- Multi-company assignment
- Change log with rollback support

### Companies
- Roster split by Push / Disposition / Gender (toggleable)
- Company deep-dive dashboard (click company name)
- Popularity slider + manual input
- Owner (linked to worker)
- Year Founded field
- Click workers in company profile to edit them

### Titles
- Level: Primary / Secondary / Tertiary
- Type: Singles / Tag / Trios
- Current Champion linked to worker

### Tag Teams
- Searchable worker selection for both members
- Biography field

### Stables
- Indefinite number of members via multi-select
- Biography field

### Events
- Event Intent: Season Finale / Special / Regular / Weekly TV
- Biography field

### Lore
- Year-only date field
- Location (country) field
- Year range filter

### Settings
- Reference date for age calculation
- Full database export as multi-sheet .xlsx
- Full database import (with overwrite warning)
- Change log with rollback to previous worker states

---

## 🗄️ Database Schema

See `supabase_schema.sql` for the full schema. Key tables:

- `workers` — Main roster with all attributes
- `companies` — Promotions/companies
- `titles` — Championships
- `tag_teams` — Tag team pairs
- `stables` — Groups with unlimited members
- `events` — Show events
- `lore` — Historical timeline entries
- `change_log` — Audit trail with rollback data
- `settings` — App configuration

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Routing**: React Router v6
- **Backend**: Supabase (PostgreSQL + Storage + Auth)
- **Hosting**: Netlify
- **Styling**: Pure CSS with CSS variables (no UI framework)
- **Excel Export**: SheetJS (xlsx)
- **Toasts**: react-hot-toast
