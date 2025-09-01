# RSS Reader (Expo + Expo Router)

## Scripts

- `npm run start|android|ios|web`
- `npm run typecheck`
- `npm run test:unit` (Jest)
- `npm run build:web` (static web export to `dist/`)
- `npm run preview:web` (serve `dist/` at http://localhost:3000)
- `npm run e2e` (Cypress)

## CI/CD

- CI workflow runs on pull requests to `main`: typecheck, Jest tests, build, Cypress E2E.
- Deploy workflow runs on push to `main`: exports static web and deploys to GitHub Pages.

## E2E

Cypress reads from `cypress.config.ts` and assumes the app is served at `http://localhost:3000`.