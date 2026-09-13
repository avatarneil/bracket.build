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

Sign in and sign up from the header, or continue browsing as a guest. Accounts currently
provide identity only; brackets still save to this browser's localStorage and do not sync
between devices or become private to a signed-in account.

For CI and deployment, configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and
`CLERK_SECRET_KEY` in the environment. Use development keys for local testing and configure
a Clerk production instance and its production keys before deploying authentication publicly.

## Tech Stack

- [Next.js 16](https://nextjs.org/) with App Router
- [React 19](https://react.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/) primitives
- [html-to-image](https://github.com/bubkoo/html-to-image) for bracket export

## License

Licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for details.
