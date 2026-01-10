# bracket.build

An interactive playoff bracket builder for the NFL postseason. Create your predictions, share them with friends, and track your picks through the playoffs.

**Disclaimer:** This project is not affiliated with, endorsed by, or connected to the National Football League (NFL) or any of its member teams. All team names, logos, and related marks are trademarks of their respective owners.

## Features

- 🏈 Full playoff bracket with Wild Card, Divisional, Championship, and Super Bowl rounds
- 💾 Automatic progress saving with localStorage
- 📱 Mobile-first responsive design
- 🖼️ Export bracket as shareable image
- 🎨 Dark mode with team colors

## Getting Started

First, install dependencies:

```bash
bun install
```

Then run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- [Next.js 16](https://nextjs.org/) with App Router
- [React 19](https://react.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/) primitives
- [@vercel/og](https://vercel.com/docs/functions/edge-functions/og-image-generation) for server-side bracket image generation

## License

Licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for details.
