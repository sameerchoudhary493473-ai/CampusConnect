# CampusConnect

CampusConnect is a client-side campus portal demo built with HTML, CSS, Vanilla JavaScript, and browser localStorage.

## Security note

Authentication and role checks are demo-only and happen entirely in the browser. This is not secure for production use.

## Pages

- `index.html`: login and signup entry page.
- `dashboard.html`: student dashboard.
- `admin.html`: admin dashboard.

## LocalStorage keys

- `campusconnect_users`
- `campusconnect_current_user`
- `campusconnect_events`
- `campusconnect_event_registrations`
- `campusconnect_complaints`

## Demo accounts

- Admin email: `admin@campusconnect.com`
- Admin password: `admin123`

Normal signup always creates a student account. The demo admin account is injected automatically if it does not already exist.

## Role flow

1. A user signs up or logs in on `/`.
2. The app stores the current user ID in `campusconnect_current_user`.
3. After login, the app checks `user.role`.
4. Students are sent to `/dashboard.html`.
5. Admins are sent to `/admin.html`.
6. If a student tries to open `/admin.html`, the app redirects them back to `/dashboard.html`.
7. Logout clears `campusconnect_current_user` and returns to `/`.

## Event data

The default event catalog is automatically stored in `campusconnect_events` on first load.
Both the student dashboard and admin dashboard read from the same event store, so admin-created edits update the student view immediately.

## Run locally

Serve the folder with a static web server and open `/`.

## Notes

- No Supabase backend is used.
- Registrations and complaints persist in localStorage.
