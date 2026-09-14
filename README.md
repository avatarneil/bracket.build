# bracket.build

A season-aware NFL schedule and playoff bracket builder. Follow preseason and regular-season games, then create predictions, share them with friends, and track picks through the playoffs.

**Disclaimer:** This project is not affiliated with, endorsed by, or connected to the National Football League (NFL) or any of its member teams. All team names, logos, and related marks are trademarks of their respective owners.

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

Vercel Production builds automatically apply committed migrations before building the app.
Configure both variables in Vercel's **Production** environment using the Neon `main` branch.
Missing migration credentials or a failed migration stops deployment. A direct-connection
advisory lock serializes concurrent builds; Drizzle records applied migrations for safe retries.
Preview and local builds skip this step and use an independently migrated development branch.

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

## Contributing

Use GitHub native stacks via the official `gh stack` extension and ordinary Git commits.
Start with `gh stack init`, add dependent layers with `gh stack add`, and publish with
`gh stack submit`. See [GitHub's stacked PR guide](https://docs.github.com/en/pull-requests/how-tos/stacked-pull-requests).

## License

Licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for details.
