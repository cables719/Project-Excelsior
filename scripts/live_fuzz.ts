import { COACH_PERSONAS, getClaraSystemPrompt } from '../web/src/lib/persona';
import { DataContext, UserProfile } from '../web/src/lib/types';
import fs from 'fs';
import path from 'path';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

// Load .env.local to get keys
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../web/.env.local') });

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
    // Only running 2 scenarios to save time/quota
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
                coachMode: p.coach,
                coachAttributes: p.attrs as any
            };

            const context = { ...sData.ctx, userProfile: mockProfile, formattedString: '' } as any; // Cast mainly for missing props

            const systemPrompt = getClaraSystemPrompt(context, new Date().toISOString());

            // --- LLM Call ---
            // Simulating a user message
            const userMessage = sKey === 'pr' ? "I just hit a 315lb squat!" : "Just logged my weight.";

            try {
                const { text } = await generateText({
                    model: google('gemini-2.0-flash-lite-preview-02-05'), // Using flash for speed
                    system: systemPrompt,
                    messages: [
                        { role: 'user', content: userMessage }
                    ]
                });
                report += `**User:** "${userMessage}"\n\n**AI Response:**\n> ${text.replace(/\n/g, '\n> ')}\n\n`;
            } catch (e) {
                report += `**Error generating response:** ${e}\n\n`;
            }

            // Extract just the "Identity" modifiers to save space
            // const modifiers = systemPrompt.split("### YOUR INSTRUCTIONS")[1]?.split("### USER CONTEXT")[0] || "Could not parse";
            // report += "**Instruction Snippet:**\n```\n" + modifiers.trim() + "\n```\n\n";
        }
        report += "---\n";
    }

    const outPath = path.join(process.cwd(), 'fuzz_report_live.md');
    fs.writeFileSync(outPath, report);
    console.log(`Report written to ${outPath}`);
}

run();
