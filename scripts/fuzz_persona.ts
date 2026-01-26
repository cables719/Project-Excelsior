import { COACH_PERSONAS, getClaraSystemPrompt } from '../web/src/lib/persona';
import { DataContext, UserProfile } from '../web/src/lib/types';
import fs from 'fs';
import path from 'path';

// --- Types & Mock Data Setup ---

// Mock function to simulate a minimal "Persona" environment 
// We are re-importing the logic from the web/src/lib/persona file.
// Ideally we run this in the ts-node environment.

const SCENARIOS = {
    neutral: {
        note: "Neutral, just logged weight.",
        ctx: { weighIns: [{ date: '2026-01-01', weight: '185', bodyFat: '20', notes: '' }], lifts: [], nutrition: [] }
    },
    pr: {
        note: "Hit a massive PR.",
        ctx: {
            weighIns: [{ date: '2026-01-01', weight: '185', bodyFat: '20', notes: '' }],
            lifts: [{ date: new Date().toISOString(), exercise: 'Squat', weight: '315', sets: '1', reps: '1', notes: 'PR!' }],
            nutrition: []
        }
    },
    missed: {
        note: "Missed workouts for a week.",
        ctx: { weighIns: [{ date: '2026-01-01', weight: '185', bodyFat: '20', notes: '' }], lifts: [], nutrition: [] }
    },
    binge: {
        note: "Overate by 1000 calories.",
        ctx: {
            weighIns: [{ date: '2026-01-01', weight: '185', bodyFat: '20', notes: '' }],
            lifts: [],
            nutrition: [{ date: new Date().toISOString(), time: '20:00', item: 'Pizza', calories: '1500', protein: '40', notes: 'Oops' }]
        }
    }
};

const PROFILES = [
    { name: "The Softy", desc: "Max Warmth, Zero Intensity", attrs: { warmth: 1.0, intensity: 0.0, verbosity: 0.5 } },
    { name: "The Drill Sgt", desc: "Zero Warmth, Max Intensity", attrs: { warmth: 0.0, intensity: 1.0, verbosity: 0.5 } },
    { name: "The Robot", desc: "Functional, Zero Emotion, Concise", attrs: { warmth: 0.0, intensity: 0.5, verbosity: 0.0 } },
    { name: "The Professor", desc: "High Verbosity, Balanced", attrs: { warmth: 0.5, intensity: 0.5, verbosity: 1.0 } },
];

async function run() {
    let report = "# Persona Fuzz Test Report\n\n";
    report += `Generated: ${new Date().toLocaleString()}\n\n`;

    for (const p of PROFILES) {
        report += `## Profile: ${p.name}\n${p.desc}\n(W: ${p.attrs.warmth}, I: ${p.attrs.intensity}, V: ${p.attrs.verbosity})\n\n`;

        for (const [sKey, sData] of Object.entries(SCENARIOS)) {
            report += `### Scenario: ${sKey} (${sData.note})\n`;

            const mockProfile: UserProfile = {
                name: "TestUser",
                activityLevel: 1.55,
                coachMode: 'clara',
                coachAttributes: p.attrs
            };

            const context = { ...sData.ctx, userProfile: mockProfile, formattedString: '' } as any; // Cast mainly for missing props

            const text = getClaraSystemPrompt(context, new Date().toISOString());

            // Extract just the "Identity" modifiers to save space
            const modifiers = text.split("### YOUR INSTRUCTIONS")[1]?.split("### USER CONTEXT")[0] || "Could not parse";

            report += "**Generated Instruction Update:**\n```\n" + modifiers.trim() + "\n```\n\n";
        }
        report += "---\n";
    }

    const outPath = path.join(process.cwd(), 'fuzz_report.md');
    fs.writeFileSync(outPath, report);
    console.log(`Report written to ${outPath}`);
}

run();
