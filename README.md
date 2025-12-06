# 🧟 Shooting Scary Shit

A zombie FPS game built with React Three Fiber, Rapier Physics, and Mixamo animations.

## Features

- 🎮 First-person shooter gameplay
- 🧟 Animated Romero zombies from Mixamo
- 🎯 Headshot damage multiplier
- 🔫 Multiple weapons (Pistol, SMG, Rifle)
- 💚 Health bars above enemies
- 🌲 Terrain with trees and rocks
- 📈 Dynamic spawn rate based on score

## Tech Stack

- **React** + **TypeScript** + **Vite**
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/rapier** - Physics engine
- **@react-three/drei** - Helpers and utilities
- **Zustand** - State management
- **Mixamo** - Character animations

## Setup

```bash
npm install
npm run dev
```

## Deployment to Vercel

1. Push to GitHub (repo name: `shooting_scary_shit`)
2. Connect repo to [Vercel](https://vercel.com)
3. Vercel will auto-detect Vite and deploy

Assets (FBX/GLB files) are included in the repo and will be served from `/public` on Vercel.

## Assets

Large assets are included in the repo. If GitHub complains about file size:
- Use Git LFS: `git lfs install && git lfs track "*.fbx" "*.glb" "*.hdr"`
- Or see `ASSETS.md` for download instructions

## Controls

- **WASD** - Move
- **Space** - Jump
- **Mouse** - Look around
- **Click** - Shoot
- **R** - Reload
- **1/2/3** - Switch weapons
