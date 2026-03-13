# GhostMitts

A little coach to tell you what combinations to throw.

## Running Locally

### Front end

Install dependencies:

```bash
npm install
```

To start a development server (recommended):

```bash
npm run dev
```

Or build first:

```bash
npm run build
```

Then run for production:

```bash
npm run start
```

This project was created using `bun init` in bun v1.3.6. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

### Voice Generation

If you want to generate the audio files yourself:

```bash
cd voicegen
python gen.py
```

Make sure to install the edge-tts and other libraries (`run pip install -r requirements.txt`) before running the Python script.
