# Project Excelsior

A personal fitness command center.

"Ever upward."

---

## Purpose

Project Excelsior is a conversational fitness system.

The goal:
- Chat with a coach persona ("Clara")
- While the system always has live access to my data
- So decisions are grounded in reality, not vibes

Conversation first.  
Data always available.

This is not a dashboard.  
This is a thinking partner.

---

## How to Start
**Right-click `start-server.ps1` and select "Run with PowerShell".**

This script will:
1. Kill any stuck background processes.
2. Clear stale cache/lock files.
3. Start the server at `http://localhost:3000`.

---

## What it tracks

Primary data source:
- Google Sheets (source of truth)

Core metrics:
- Daily weigh-ins
- Body fat %
- Lifting sessions (weights, volume, PRs)
- Cardio (time, HR, intensity)
- Notes (sleep, stress, soreness)
- **Nutrition (broad, not obsessive)**
  - protein intake
  - general calorie patterns
  - alcohol frequency
  - high-level meal trends

No macro micromanagement.
Just pattern awareness.

---

## Frontend vision

Chat-first interface:
- Text-message style layout
- Persona name: Clara
- Eventually:
  - profile picture / avatar
  - typing indicator
  - "seen" status
  - clean, human feel (not SaaS-y)

Optional side panel:
- rolling averages
- recent workouts
- PR log
- weekly summaries

---

## Backend (conceptual)

- Pulls last 7–14 days from Google Sheets
- Creates a compact context summary
- Injects that into every model call
- Stores conversation history + data snapshots

Model:
- System prompt defines Clara’s voice:
  - warm
  - direct
  - disciplined
  - curious about real life
  - no therapy-speak
  - no gym-bro nonsense

---

## Long-term ideas

- Auto weekly reviews
- PR detection
- Plateau warnings
- Recovery flags (sleep + volume mismatch)
- Simple input form (phone-friendly)
- Exportable reports
- Nutrition trend analysis
- Fitness equivalent of "D11 Palantir"

---

## Philosophy

This is not a tracker.
This is a **coach you talk to.**

The point:
- better decisions
- less noise
- long-game consistency

Build slowly.
Optimize for usefulness, not features.

When you are opened for the first time, introduce yourself and suggest first building a "backlog.md" file that contains a list of projects to work towards and collaborate with the user towards that list before jumping in to code anything.