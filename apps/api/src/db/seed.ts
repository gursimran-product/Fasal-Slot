import "dotenv/config";
import { pool } from "./pool";

const CENTRES = [
  { name: "Karnal Mandi", district: "Karnal", state: "Haryana" },
  { name: "Kurukshetra Mandi", district: "Kurukshetra", state: "Haryana" },
  { name: "Sirsa Mandi", district: "Sirsa", state: "Haryana" },
];

const CROPS = ["wheat", "paddy"];
const TIME_WINDOWS = ["09:00-11:00", "11:00-13:00", "14:00-16:00"];

async function main() {
  for (const centre of CENTRES) {
    const { rows } = await pool.query(
      `INSERT INTO centres (name, state, district, crops)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [centre.name, centre.state, centre.district, CROPS]
    );
    const centreId = rows[0].id;

    const today = new Date();
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      const dateStr = date.toISOString().slice(0, 10);

      for (const window of TIME_WINDOWS) {
        await pool.query(
          `INSERT INTO centre_capacity (centre_id, date, time_window, total_slots)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (centre_id, date, time_window) DO NOTHING`,
          [centreId, dateStr, window, 20]
        );
      }
    }

    console.log(`seeded centre: ${centre.name} (${centreId})`);
  }

  console.log("seed complete");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
