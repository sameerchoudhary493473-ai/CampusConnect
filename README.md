# CampusConnect

CampusConnect is a student portal built with HTML5, CSS3, Vanilla JavaScript, and Supabase.

## What changed

- Added `login.html` for Supabase authentication
- Reworked `index.html` into a guarded dashboard with a horizontal navigation shelf
- Added `auth.js` for shared Supabase auth helpers
- Replaced localStorage data flow with Supabase-backed events, registrations, profiles, and complaints
- Added `login.css` for the dedicated authentication page
- Added `supabase-schema.sql` for the database setup

## Files

### Created

- `login.html`
- `login.css`
- `auth.js`
- `supabase-schema.sql`

### Modified

- `index.html`
- `style.css`
- `script.js`
- `README.md`

## How authentication works

- `login.html` uses Supabase Auth with email and password.
- `auth.js` calls `supabase.auth.signUp()` for signup and `supabase.auth.signInWithPassword()` for login.
- The user's full name is stored in user metadata during signup.
- After login, the app redirects to `index.html`.
- If there is no active session, `index.html` redirects users back to `login.html`.
- Logout uses `supabase.auth.signOut()` and then redirects to `login.html`.

## Database relationships

- `profiles.id` references `auth.users.id`
- `event_registrations.user_id` references `auth.users.id`
- `event_registrations.event_id` references `events.id`
- `complaints.user_id` references `auth.users.id`

## Row Level Security

RLS is enabled on:

- `profiles`
- `events`
- `event_registrations`
- `complaints`

Policies restrict access so users can only read and modify their own profile, registrations, and complaints. Events are readable by authenticated users.

## Supabase configuration

Open `auth.js` and replace these placeholders:

- `YOUR_SUPABASE_URL`
- `YOUR_SUPABASE_PUBLISHABLE_KEY`

Do not put your service role key in browser code.

## How to run locally

1. Set your real Supabase URL and publishable key in `auth.js`.
2. Open the project with a local web server.
3. Start on `login.html`.
4. Sign up or sign in.
5. After authentication, the app redirects to `index.html`.

## How to create the database

1. Open your Supabase project.
2. Go to the SQL Editor.
3. Paste the contents of `supabase-schema.sql`.
4. Run the script.
5. Verify the sample events were inserted.

## Notes

- Complaint status management is intentionally restricted on the student side.
- The dashboard loads data from Supabase instead of localStorage.
- If you later add an admin panel, status updates can be handled there securely.
