# GhostMitts

<img src="src/assets/logo.svg" alt="Logo" width="180" height="180">

Your personal audio-guided combat sports combinations coach for Boxing, Kickboxing, Muay Thai, MMA, and Wrestling.

## Features

- **Audio-First Coaching**: Hands-free combinations called out via voice or sound prompts.
- **Combat Sport Presets**: Built-in move sets for Boxing, Kickboxing, Muay Thai, MMA, and Wrestling.
- **Customizable Combos**: Adjust combination length, pacing intervals, and individual strikes.
- **Visual Display Modes**: Multiple display styles (Numbers, Names, Minimal, Compact).
- **Accounts & Cloud Sync**: Practice streak tracking, workout history, and saved custom presets.
- **Responsive Layout**: Optimized interfaces for both desktop and mobile training.

## Running Locally

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Frontend

```bash
npm run dev
```

### 3. Start Backend API (Optional)

```bash
# Copy local env file
copy worker\.dev.vars.example worker\.dev.vars

# Start worker dev server
npm run api:dev
```

---

> For database provisioning (Turso/SQLite), production deployment, custom domains, and voice generation details, see [docs/setup.md](docs/setup.md).
