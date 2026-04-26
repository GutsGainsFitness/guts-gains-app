---
name: Admin registration security
description: Registration uses server-side invite code validation via edge function; no client-side secrets
type: feature
---
Admin registration on /login validates invite code server-side via the `validate-invite-signup` edge function.
The invite code is stored as ADMIN_INVITE_CODE secret (defaults to GUTSGAINS).
New admins are automatically assigned the admin role in user_roles table.
