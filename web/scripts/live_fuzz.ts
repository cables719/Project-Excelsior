import { COACH_PERSONAS, getClaraSystemPrompt } from '../src/lib/persona';
import { DataContext, UserProfile } from '../src/lib/types';
import fs from 'fs';
import path from 'path';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

// Load .env.local to get keys
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Mock function to simulate a minimal "Persona" environment 
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
};

// Only testing 2 profiles for speed
const PROFILES = [
    { name: "Ember (Intense)", desc: "Warmth 1.0, Intensity 1.0, Verbosity 1.0", coach: 'ember', attrs: { warmth: 1.0, intensity: 1.0, verbosity: 1.0 } },
    { name: "The Robot", desc: "Zero Emotion, Concise", coach: 'clara', attrs: { warmth: 0.0, intensity: 0.5, verbosity: 0.0 } },
];

async function run() {
    let report = "# Persona Output Fuzz Test (Live LLM)\n\n";
    report += `Generated: ${new Date().toLocaleString()}\n\n`;

    console.log("Starting Fuzz Test with Live LLM...");

    for (const p of PROFILES) {
        report += `## Profile: ${p.name}\n${p.desc}\n\n`;
        console.log(`Testing Profile: ${p.name}`);

        for (const [sKey, sData] of Object.entries(SCENARIOS)) {
            report += `### Scenario: ${sKey} (${sData.note})\n`;

            const mockProfile: UserProfile = {
                name: "TestUser",
                activityLevel: 1.55,
                coachMode: p.coach as any,
                coachAttributes: p.attrs as any
            };

            const context = { ...sData.ctx, userProfile: mockProfile, formattedString: '' } as any; // Cast mainly for missing props

            const systemPrompt = getClaraSystemPrompt(context, new Date().toISOString());

            // --- LLM Call ---
            // Simulating a user message
            const userMessage = sKey === 'pr' ? "I just hit a 315lb squat!" : "Just logged my weight.";

            try {
                // Using 2.0-flash experimental or whatever is available, falling back to flash-lite if needed
                // Using 'gemini-2.0-flash-exp' or 'gemini-1.5-flash' based on env
                const modelName = 'gemini-2.0-flash-lite-preview-02-05';

                const { text } = await generateText({
                    model: google(modelName),
                    system: systemPrompt,
                    messages: [
                        { role: 'user', content: userMessage }
                    ]
                });
                report += `**User:** "${userMessage}"\n\n**AI Response:**\n> ${text.replace(/\n/g, '\n> ')}\n\n`;
            } catch (e) {
                report += `**Error generating response:** ${e}\n\n`;
            }
        }
        report += "---\n";
    }

    // Write to ROOT/fuzz_report_live.md for easy access
    const outPath = path.join(__dirname, '../../fuzz_report_live.md');
    fs.writeFileSync(outPath, report);
    console.log(`Report written to ${outPath}`);
}

run();
