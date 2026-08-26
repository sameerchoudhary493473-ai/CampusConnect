# CampusConnect

CampusConnect is a student portal demo built with HTML5, CSS3, and Vanilla JavaScript. It uses browser `localStorage` for demonstration-only authentication and data persistence.

## Important security note

This project stores demo passwords in the browser. It is not production-secure authentication and must not be used for real student accounts or sensitive data.

## Routes

- `/` serves `login.html` through `vercel.json`.
- `/dashboard` serves the protected dashboard from `index.html`.

## Files

- `login.html` and `login.css`: authentication interface.
- `index.html` and `style.css`: existing dashboard interface.
- `script.js`: demo authentication, routing guards, event registration, complaint tracking, and UI behavior.
- `vercel.json`: Vercel rewrites for the login and dashboard routes.

## Local data architecture

- `campusconnect_users` stores demo user records.
- `campusconnect_current_user` stores the active user ID.
- `campusconnect_event_registrations` stores registrations with `userId` and `eventId`.
- `campusconnect_complaints` stores complaints with `userId`, status, and submission details.

All user-specific registrations and complaints are filtered by the active user's ID, so users see only their own records in the browser demo.

## Run locally

Serve the folder with any static web server and open `/`. For example, use VS Code Live Server or another local HTTP server. The login page is the application entry point.

## Vercel deployment

Deploy the repository as a static Vercel project. Keep this `vercel.json` in the project root:

```json
{
  "rewrites": [
    { "source": "/", "destination": "/login.html" },
    { "source": "/dashboard", "destination": "/index.html" }
  ]
}
```

No external authentication service, backend, database, or environment variables are required.
