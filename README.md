# bracket.build

A season-aware NFL and FBS college football schedule and playoff bracket builder. Follow preseason and regular-season games, then create predictions, share them with friends, and track picks through the playoffs.

**Disclaimer:** This project is not affiliated with, endorsed by, or connected to the National Football League (NFL), NCAA, College Football Playoff, or any of their member teams. All team names, logos, and related marks are trademarks of their respective owners.

## Features

- 🗓️ Current and prior-season schedules with week dates, live details, and final scores
- 🖥️ Wide-screen schedule sidebar with inline, auto-refreshing live game details
- 🔒 Postseason picks unlock only after that season's playoff schedule is posted
- ⏭️ Phase and week navigation for upcoming games
- 🏈 Full playoff bracket with Wild Card, Divisional, Championship, and Super Bowl rounds
- 💾 Automatic progress saving with localStorage
- 📱 Mobile-first responsive design
- 🖼️ Export bracket as shareable image
- 🎨 Dark mode with team colors
- 👤 Clerk sign-in, sign-up, and profile controls

## College football

Choose **College football** to browse FBS schedules and live or final game details.
The league, season, phase, week, and selected game are deep-linkable. **Bowls / CFP**
includes both bowl games and the dedicated CFP schedule. The published 12-team CFP
field unlocks picks with four first-round byes and fixed paths (no reseeding).
Changing an earlier pick clears dependent picks that are no longer possible.

CFP picks save in this browser separately for each season. Account saves, share links,
image export, and NFL historical insights remain NFL-only. CFP picks require a complete,
consistent field in ESPN's playoff feed; ordinary rankings never unlock a bracket.
The 2025 field is available by selecting the prior season. Current-season picks wait
for the published field, and partial feeds show an explicit unavailable state.

## Getting Started

First, install dependencies:

```bash
bun install
```

Link the Clerk development application and pull its local configuration:

```bash
clerk auth login
clerk init --app app_3JIG7yUoXrPnpfQD5YLkhamcC00
clerk doctor
```

Select the personal Clerk workspace containing `bracket.build` when authorizing the CLI.
Clerk writes development keys to the ignored `.env.local` file. Never commit secret keys.
For an already configured checkout, use `clerk env pull` after linking instead of repeating initialization.

Then run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Sign in from the header and open **My brackets** to create, save, and reopen private
brackets across devices. Guest brackets remain in browser storage. Use **Import browser
brackets** to copy those saves into your account; the originals remain on this device.

Saved brackets can publish a read-only snapshot with **Create share link**. Links expose
the bracket name, display name, subtitle, and picks to anyone holding the link. Further
edits stay private until published again. Stop sharing to permanently revoke that link.
Friends can compare their account brackets on the shared page. Correct-pick counts are
informal because predictions remain editable. Account saves currently support the 2025 postseason.

For CI and deployment, configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and
`CLERK_SECRET_KEY` in the environment. Use development keys for local testing and configure
a Clerk production instance and its production keys before deploying authentication publicly.

## Tech Stack

- [Next.js 16](https://nextjs.org/) with App Router
- [React 19](https://react.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/) primitives
- [html-to-image](https://github.com/bubkoo/html-to-image) for bracket export

## Account storage

Account brackets use Postgres, Drizzle migrations, and Clerk user IDs. Set `DATABASE_URL`
to a pooled connection for the app and `DATABASE_URL_UNPOOLED` to a direct connection
for migrations. Keep both in your environment manager; never commit connection strings.

Vercel Production and Preview builds automatically apply committed migrations before building the app.
Configure both variables in Vercel's **Production** environment using the Neon `main` branch.
For **Preview**, let the Neon integration supply both URLs for that preview's branch.
The migration and runtime URLs must target the same database branch.
Missing migration credentials or a failed migration stops deployment. A direct-connection
advisory lock serializes concurrent builds; Drizzle records applied migrations for safe retries.
Local builds skip this step; run `bun run db:migrate` to update your local development database.

Migrations run before traffic switches, so schema changes must remain compatible with the
currently deployed app. Use additive changes first; remove old columns in a later release.
Rolling back an app deployment does not roll back the database schema.

```bash
bun run db:migrate
bun run test:unit
```

Test schema changes on an isolated Neon development branch before applying them to production.
CI runs migrations and ownership/conflict/sharing tests against an ephemeral Postgres service.
Local storage integration tests run when `TEST_DATABASE_URL` points to a migrated test database.
Authenticated browser tests require Clerk development keys. They create temporary
users with `+clerk_test` email addresses (no email delivery) and delete them after
each worker finishes. Settings responses are mocked in browser tests; persistence
and account isolation are checked against the test database.

## Game notifications and PWA

Sign in and open **Settings → Notifications**. Turn on **Allow notifications**, then
**Enable this device** to grant browser permission. Each browser or installed app
needs its own enrollment. The master switch pauses alerts across devices without
removing follows. **Remove all notification devices** revokes enrollment everywhere;
those devices must be explicitly enabled again. Signing out unsubscribes the current
browser when the app observes the account change.

- **Game start**: confirmed kickoff for individually followed games or teams in a
  selected NFL/FBS season, including postseason. Each follow has independent kickoff
  and major-update controls, in addition to the account-wide switches.
- **Major game updates**: score changes, lead changes, ties, and finals. Several plays
  between polls can produce one combined score update.
- **Recommended games**: within 15 minutes of scheduled kickoff for postseason games,
  two ranked top-25 teams, or two teams with at least a 60% winning record after three games.
- **Games heating up**: one alert per game for an eight-point-or-closer fourth quarter,
  or overtime. Recommendations and heating-up alerts have separate NFL/FBS selections
  and include games outside your follows.

Use **Game alerts…** beside an upcoming/live schedule game to preselect it in settings,
or choose a league, season, phase, week, and game/team there. Add another season as a
separate team follow. Follows persist across devices; notification permission does not.

The manifest supports installing bracket.build. On iOS/iPadOS 16.4+, use **Share →
Add to Home Screen**, launch from the icon, and then enable notifications. Desktop
and Android browsers with standard Web Push also work. Blocked permission must be
changed in browser/device settings. **Show test notification** tests local display;
it does not send through the remote push service. The worker handles background
push and opens the matching game without navigating an existing bracket editor.
Pages and account data are not cached offline.

### Enable server delivery

Generate a VAPID key pair once with `bunx web-push generate-vapid-keys`. Store these
in Vercel's environment manager (never commit the private key):

| Variable | Value |
| --- | --- |
| `VAPID_PUBLIC_KEY` | Generated public key, served to signed-in clients |
| `VAPID_PRIVATE_KEY` | Generated private key, server only |
| `VAPID_SUBJECT` | Contact URI, such as `mailto:you@example.com` or `https://bracket.build` |
| `CRON_SECRET` | The existing shared cron secret, or a random secret of at least 32 characters |
| `NOTIFICATION_ORIGIN` | Optional canonical origin; defaults to `https://bracket.build` |

Use separate keys for development and production. Apply the additive migration via
the existing deployment migration runner. The one-minute `/api/cron/notifications`
schedule requires Vercel Pro or Enterprise. Preview deployments never run the
dispatcher, even if called manually; preferences and local notification display can
still be tested there. Missing VAPID settings leave enrollment disabled and the cron
inactive. No push-provider credentials or production configuration are provisioned
by this PR.

The dispatcher polls the current scoreboard plus the preceding Eastern date to
cover late games across week boundaries. It avoids feed requests without enabled
devices, saves score baselines atomically with deduplicated events, and persists a
delivery queue. New opt-ins never replay prior events. Cold starts and gaps over ten
minutes establish a fresh baseline without announcing old kickoffs/scores/finals.
Alerts expire after five minutes. Delivery claims prevent ordinary overlapping-run
duplicates; transient failures retry up to three times and HTTP 404/410 removes
expired subscriptions. A crash after the push provider accepts a message can still
cause redelivery; stable notification tags coalesce it where supported. Each run
sends up to 100 deliveries, with ten concurrent requests, and removes event history
after eight days. Large audiences require increasing dispatcher throughput before
the five-minute queue expiry. Browser/OS policy and ESPN latency affect arrival time.

Verify settings, API ownership, rules, concurrent claims, opt-outs, retries, and the
worker with `bun run test:unit` (set `TEST_DATABASE_URL` for storage tests) and
`bun run test:e2e e2e/tests/notifications.spec.ts`. Before enabling production delivery,
verify a real background push on each target installed browser/device.

## Ridiculous game stats

Sign in, open **Settings**, and enable **Ridiculous stats (BETA)**. The setting
defaults to off and is saved to your account across devices. Guests and accounts
that have not opted in do not see the feature; its API also requires opt-in.
Settings and insight responses are private and never cached by the CDN.

Then open a game's **Stats** tab and choose **Generate ridiculous stat**. Both the
setting and insight card carry a **BETA** badge. The feature
searches 20 team metrics across opponent nickname categories, month, weekday, and
home/away/neutral location, plus the exact opponent and overall team history.
Every claim starts with a measured total from the selected game. Football-context
comparisons take priority, with first-since claims ahead of records and ties,
including rare low totals in completed games. Letter-count categories share at
most one result per game, shown after the other comparisons. There is no standalone
historical-trivia fallback or LLM.
Before kickoff or without a supported comparison, the feature shows an empty
state. **Show the receipts** lists every earlier
comparison game, with pagination, metric values, dates, and ESPN links.

Historical data comes from [nflverse team stats](https://nflreadr.nflverse.com/reference/load_team_stats.html)
and [nflverse schedules](https://nflreadr.nflverse.com/reference/load_schedules.html).
The two small CSV test fixtures are excerpts of those sources for the 2025
Arizona–New Orleans game. The ESPN JSON fixture contains team totals from the
live Seattle–Arizona game on September 20, 2026. The archive covers regular-season and postseason games
from 1999; preseason is not included. Source data remain subject to their owners'
[terms](https://nflverse.nflverse.com/#terms-of-use).

Apply the migration and load the archive into your **development or preview**
database before testing. The importer uses `DATABASE_URL`; Bun reads `.env.local`.

```bash
bun run db:migrate
bun run stats:import --dry-run
bun run stats:import
# Refresh a specific range, including historical corrections:
bun run stats:import --from 2003 --to 2025
```

Without a range, the importer backfills missing seasons and refreshes the latest
two seasons. Each season is validated and replaced atomically; reruns are safe.
Missing box scores and measurements stay null. Unsupported comparisons, gaps in
imported seasons, and cohorts smaller than ten games never produce a record.
Regular-season and playoff comparisons are separate. Historical games never
use later games as evidence. Team history follows franchise relocations, while
nickname classifications and display names use the season's identity. "Animal"
means the team nickname, not the costumed mascot; Buffalo's Bills are not included.

ESPN supplies live context. Its missing values stay null in the comparison engine,
and live claims say "so far" and compare against completed games. Missing current
values cannot trigger claims, and low-total claims wait until the game is final.
Generated insights stay at their labeled snapshot time while the box score polls;
choose **Another ridiculous stat** to fetch a new snapshot. The existing insight
stays visible while that request loads.
Touchdowns, field goals, and punts come from ESPN's explicit team totals in the
player-stat groups; missing totals are never inferred as zero. First-since claims
require a complete comparison set of at least ten games and at least five
intervening qualifying games. They can describe recent occurrences within the
same season. After import, completed games use
the same corrected nflverse metrics as their historical comparison games. Games
on the current Eastern date stay provisional until a later import. Archive
updates also pick up nflverse's subsequent stat corrections.

For production, set a random **`CRON_SECRET`** of at least 32 characters in Vercel.
The daily 10:00 UTC cron authenticates with that secret, backfills the archive on
its first run, and subsequently refreshes the latest two seasons. Vercel cron jobs
run only on production deployments. Preview databases must be seeded with the
CLI; an unseeded preview displays an archive-unavailable message. To populate a
new production database immediately after deployment, run `bun run stats:import`
with that environment's database connection. An interrupted import resumes at
the remaining seasons on the next run. Upstream or database failures preserve
previously committed season snapshots and leave ordinary game stats usable.

## Contributing

Use GitHub native stacks via the official `gh stack` extension and ordinary Git commits.
Start with `gh stack init`, add dependent layers with `gh stack add`, and publish with
`gh stack submit`. See [GitHub's stacked PR guide](https://docs.github.com/en/pull-requests/how-tos/stacked-pull-requests).

## License

Licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for details.
