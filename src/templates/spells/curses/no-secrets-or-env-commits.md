---
name: no-secrets-or-env-commits
type: curse
severity: hard
description: Hard stop against committing environment files or credentials
---

Never commit `.env`, `.env.*` (except `.env.example`), private keys (`*.pem`, `id_rsa`),
or API tokens. If staged, unstage immediately and alert the user.
