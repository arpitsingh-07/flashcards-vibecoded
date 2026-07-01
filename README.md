# FlashFocus

A flashcard app for studying with spaced repetition. Generate cards from a topic using Gemini, or add them manually, then review with a scheduler that adapts to how well you know each card.

**Live demo:** https://flashcards-vibecoded.vercel.app

## Features

- AI-generated flashcards from any topic or text (Gemini API)
- Manual card creation and editing
- Spaced-repetition review scheduling
- Progress stats and charts
- Responsive, animated UI

## Stack

React 19 - Vite - TypeScript - Tailwind CSS - Express - Google Gemini API - Recharts

## Running locally

```bash
npm install
cp .env.example .env.local   # add your GEMINI_API_KEY
npm run dev
```

## Build

```bash
npm run build
npm start
```
