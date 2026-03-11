import { fetchContext } from './web/src/lib/data';
import { getWeeklyStats } from './web/src/lib/report';
import * as dotenv from 'dotenv';
dotenv.config({ path: './web/.env.local' });

async function main() {
    try {
        const data = await fetchContext(365, undefined, true);
        const requestDate = new Date('2026-03-08T08:01:22-06:00');
        console.log("Simulating Request Date:", requestDate.toString());

        const stats = getWeeklyStats(data, requestDate);
        console.log("Weekly Stats Window:", stats.period);
        console.log("Days Logged:", stats.nutrition.daysLogged);

        // Let's manually do the aggregation to see which days it found
        const endDate = new Date(requestDate);
        endDate.setDate(requestDate.getDate() - 1);
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 6);

        const isWithin = (dateStr: string, start: Date, end: Date) => {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return false;
            const dTime = d.setHours(0, 0, 0, 0);
            const sTime = start.setHours(0, 0, 0, 0);
            const eTime = end.setHours(23, 59, 59, 999);
            return dTime >= sTime && dTime <= eTime;
        };

        const weekNutrition = data.nutrition.filter(x => isWithin(x.date, startDate, endDate));

        const dailyNutrition: Record<string, { cals: number, pro: number }> = {};
        weekNutrition.forEach(n => {
            const d = n.date.split(' at ')[0];
            if (!dailyNutrition[d]) dailyNutrition[d] = { cals: 0, pro: 0 };
            dailyNutrition[d].cals += parseFloat(n.calories) || 0;
            dailyNutrition[d].pro += parseFloat(n.protein) || 0;
        });

        console.log("\nRaw weekNutrition returned by isWithin:");
        weekNutrition.forEach(n => console.log(JSON.stringify(n)));

        console.log("\ndailyNutrition Keys (days logged):", Object.keys(dailyNutrition));

    } catch (e) {
        console.error(e);
    }
}
main();
