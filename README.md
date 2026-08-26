# CampusConnect

CampusConnect is a student portal demo built with HTML5, CSS3, Vanilla JavaScript, and browser localStorage.

## Important security note

This is demo-only client-side authentication. It stores passwords in the browser and is not suitable for production or real student data.

## File structure

- `index.html`: login and signup entry page.
- `login.css`: login page styles.
- `dashboard.html`: protected dashboard page.
- `style.css`: existing dashboard styles.
- `script.js`: authentication, routing guard, events, registrations, complaints, and UI behavior.
- `vercel.json`: optional clean `/dashboard` route.

## Routes

- `/` naturally serves `index.html`, the login page.
- `/dashboard.html` serves the protected dashboard.
- `/dashboard` rewrites to `/dashboard.html` through `vercel.json`.

## LocalStorage keys

- `campusconnect_users`
- `campusconnect_current_user`
- `campusconnect_event_registrations`
- `campusconnect_complaints`

Registrations and complaints include the current user's ID. The dashboard filters these records before rendering them, so separate demo users do not see each other's data.

## Run locally

Serve the folder with a static web server, then open `/`. Create an account or sign in. Successful authentication opens `/dashboard.html`.

## Deploy to Vercel

Deploy the repository as a static project with `vercel.json` in the root. No backend, API key, database, or environment variable is required.
