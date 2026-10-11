# Local Google/GitHub OAuth Setup — Windows

This guide adds optional Google and GitHub sign-in to the existing local Supabase Auth stack. It does not link, modify, or require a hosted Supabase project. No credentials are needed when testing email/password authentication; with no complete provider credential pair, the app hides that provider's button and the separator.

The provider client ID/secret must stay in ignored `.env.local` and are consumed by the local Supabase Auth service through `supabase/config.toml`. The browser never receives these values. The browser does follow the server-generated OAuth authorization redirect, as required by OAuth; application JavaScript does not initialize a Supabase browser client or call Supabase Auth APIs.

## 1. Start the local stack once

From the repository root in PowerShell:

```powershell
.\scripts\supabase-local.ps1 -Action up -WriteAppEnv
```

This uses the existing minimal local stack configuration and writes a development-only `.env.local` if one does not already exist. It refuses to overwrite an existing file. The selected services remain Auth, PostgreSQL, Storage, Edge Runtime, and required API/PostgREST plumbing; this guide does not enable Studio, Realtime, Analytics, a local SMTP UI, or other optional services.

## 2. Create the provider applications

Use the same local Supabase Auth callback for each provider:

```text
http://127.0.0.1:54321/auth/v1/callback
```

### Google

1. In Google Cloud Console, select or create a development project and configure the OAuth consent screen. If the app is in testing mode, add your Google account as a test user.
2. Create an OAuth client with application type **Web application**.
3. Add the callback above as an **Authorized redirect URI**.
4. Copy the client ID and client secret locally. Do not put either value in source control or chat.

The local Supabase config sets `skip_nonce_check = true` for Google because the Supabase local Google flow requires it. This is limited to the local Auth stack; PKCE/state and the server-managed callback remain in use. Do not copy this local-only setting into a hosted environment without an explicit security review.

### GitHub

1. In GitHub, open **Settings → Developer settings → OAuth Apps** and create a development OAuth app.
2. Set the application homepage to `http://localhost:3000`.
3. Set the **Authorization callback URL** to the callback above.
4. Copy the client ID and generate/copy a client secret locally.

The app requests `read:user user:email` so Supabase can obtain a usable email for OKEngine's existing Auth-UUID profile and workspace provisioning flow. If a provider still returns no email, the callback fails closed rather than creating a partial workspace session.

## 3. Add credentials to the ignored local environment

Open `.env.local` in a local editor and fill only the values you have configured:

```dotenv
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=
SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=
```

Leave both values for a provider blank to keep that provider unavailable. Do not add a `NEXT_PUBLIC_` prefix. Do not paste credentials into an issue, pull request, or chat.

The PowerShell setup script imports only these four allow-listed variables into its process environment before invoking the Supabase CLI. It does not execute `.env.local` as PowerShell and does not print the values.

## 4. Restart local Auth without resetting the database

After editing `.env.local`, stop and start the local stack so the Auth service reads the updated provider config:

```powershell
.\scripts\supabase-local.ps1 -Action down
.\scripts\supabase-local.ps1 -Action up
```

`down` stops containers without deleting their local volumes. Do not use `-Action reset` just to enable OAuth; reset drops local database data.

Start OKEngine in another PowerShell window:

```powershell
npm run dev
```

## 5. Verify configuration and sign-in

Check the safe provider manifest:

```powershell
Invoke-RestMethod http://localhost:3000/api/auth/providers
```

Expected examples:

```text
providers
---------
{google}
```

or, with both providers configured:

```text
providers
---------
{google, github}
```

The response contains provider names only—never IDs or secrets. With no complete credential pairs it returns an empty provider list; the login and signup pages show no OAuth buttons and no orphaned divider.

Then:

1. Open `http://localhost:3000/login` or `/signup` and choose a configured provider.
2. Accept the Terms/Privacy prompt for social sign-in. On login, also select **Remember me** if the session should use the existing 30-day persistence preference.
3. Complete the provider flow and confirm that the browser returns to the same-origin `/auth/callback` before entering the provisioned workspace.
4. Confirm `/api/auth/session` reports the safe user/workspace projection and contains no access or refresh token.
5. Sign out and verify the Supabase session and Remember me preference are cleared.

## Troubleshooting

- **Provider button is missing:** confirm both values for that provider are non-blank in `.env.local`, then stop/start the local stack and restart `npm run dev`.
- **Supabase provider is unavailable:** confirm the client ID/secret are from the same provider app and check the local CLI output for config errors. Do not print or share the secret while troubleshooting.
- **Redirect URI mismatch:** the provider console callback must be exactly `http://127.0.0.1:54321/auth/v1/callback`; the separate app callback is `http://localhost:3000/auth/callback` and is allow-listed in the local Supabase config.
- **GitHub returns no usable email:** verify the requested `user:email` scope and the account's email availability. The callback intentionally refuses to provision a partial session.
- **Email/password does not need OAuth credentials:** leave both provider pairs blank; Auth and the rest of the local stack continue to work.

For the base Windows stack, migrations, and local service footprint, see [LOCAL-SUPABASE-WINDOWS.md](./LOCAL-SUPABASE-WINDOWS.md).
