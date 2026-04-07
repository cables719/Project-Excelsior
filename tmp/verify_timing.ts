import { getClaraSystemPrompt } from './web/src/lib/persona';
import { DataContext } from './web/src/lib/types';

const mockContext: DataContext = {
    weighIns: [],
    lifts: [],
    cardio: [],
    nutrition: [],
    eaglesPeakLogs: [],
    hydrationLogs: [],
    wellnessLogs: [],
    userProfile: {
        name: "Test User",
        age: 30,
        sex: 'M',
    },
    formattedString: ""
};

const clientDate = "Wednesday, March 25, 2026";
const clientTime = "12:24:42 PM";

const prompt = getClaraSystemPrompt(mockContext, clientDate, clientTime);

console.log("=== PROMPT START ===");
console.log(prompt);
console.log("=== PROMPT END ===");

if (prompt.includes("### CURRENT DATE & TIME")) {
    console.log("SUCCESS: Current Date & Time block found.");
} else {
    console.log("FAILURE: Current Date & Time block missing.");
}

if (prompt.includes(`- **Today's Date:** ${clientDate}`)) {
    console.log(`SUCCESS: clientDate "${clientDate}" found in prompt.`);
} else {
    console.log("FAILURE: clientDate missing or incorrect.");
}

if (prompt.includes(`- **Current Time:** ${clientTime}`)) {
    console.log(`SUCCESS: clientTime "${clientTime}" found in prompt.`);
} else {
    console.log("FAILURE: clientTime missing or incorrect.");
}
