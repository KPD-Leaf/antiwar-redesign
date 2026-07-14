# Integrations

## antiwar-instant-publish (WordPress plugin)

Makes new posts appear on the static site ~2–3 minutes after an editor hits **Publish**, instead of waiting for the hourly rebuild. No theme editing.

**Install (once per WordPress install — `news` and `blog`):**

1. Zip the `antiwar-instant-publish` folder (or download it from GitHub).
2. In WordPress admin: **Plugins → Add New → Upload Plugin**, upload the zip, activate.
3. Go to **Settings → Instant Publish** and enter:
   - **GitHub repository** — the fork that hosts the site, e.g. `your-org/antiwar-redesign`.
   - **GitHub token** — a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) scoped to *only that repository* with the **Contents: read & write** permission. That's the minimum GitHub requires to fire a rebuild; the token can't touch anything else.
4. Click **Send Test Rebuild**. Success means a build is running — check the repository's Actions tab.

From then on, every publish (posts, any post type) triggers a rebuild automatically. The hourly cron stays on as a safety net, and also picks up Opinion pieces from `original.antiwar.com` if the plugin isn't installed there.

**Hosting elsewhere?** If the site is on Netlify or Cloudflare Pages instead of GitHub Pages, use their build-hook URL instead — same idea, one POST on publish. Open an issue and we'll adapt the plugin.
