fetch('http://localhost:3000/api/blueprint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    blueprint: "I do a 3-day split: Push, Pull, Legs. I want 3 sets of 8-12 reps per exercise.",
    constraints: "My left knee hurts, avoid heavy squats today.",
    lifts: [],
    clientDate: "2023-11-01"
  })
}).then(async r => {
    const text = await r.text();
    console.log("Status:", r.status);
    console.log("Response:", text);
}).catch(console.error);
