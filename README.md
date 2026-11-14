# SoundDeck Studio

All-in-one dark-mode music workspace for artists, content creators, and DJs featuring AI lyrics & voice alignment, beat pads, multi-track DAW with Audacity bridge, Virtual DJ console, Social Hub, Discover & BuymeSoda creator support.

## Features

- **Music Creation & Beat Pads**: 16 hardware-style beat pads with real-time Web Audio API synthesis (808s, kicks, snares, hats, synths), custom sample chops, AI-powered lyrics generation with cadence matching and vocal guide.
- **Multi-Track DAW**: 6-track audio workstation with pan, mute/solo, FX chains (reverb, delay, distortion, EQ, compressor), and bidirectional Audacity project format bridge.
- **Virtual DJ Console**: Dual-deck hardware console (Deck A / Deck B) with rotating vinyl scratch emulation, crossfader, tempo pitch shift, 3-band EQ kills, and stem isolation.
- **Social Hub**: Creator profiles, collaboration posts, campaigns, direct creator tipping via BuymeSoda, and activity feed.
- **Global Discover**: Music search, catalog sound grooves, preview playback, sample chopper to pads, and persistent sticky bottom audio player.
- **3D Mastering Stage**: Interactive Three.js 3D audio-reactive studio visualizer.
- **AI Studio Assistant**: Real-time Gemini-powered producer chat for songwriting, mixing, and transition advice.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Three.js, Lucide Icons, Motion
- **Audio Engine**: Web Audio API, Custom AudioWorklet/DSP synthesis, WAV encoding/decoding
- **Backend**: Node.js, Express, Google GenAI SDK (`gemini-4-hydrogen`)
- **Database & Auth**: Firebase Firestore & Firebase Auth with role-based access
