import "dotenv/config";
import bcrypt from "bcryptjs";
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

    if (centre.name === "Karnal Mandi") {
      const passwordHash = await bcrypt.hash("password123", 10);

      await pool.query(
        `INSERT INTO agents (name, phone, email, password_hash, centre_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (phone) DO NOTHING`,
        ["Demo Agent", "9990001111", "agent@example.com", passwordHash, centreId]
      );
      console.log("seeded demo agent: agent@example.com / 9990001111 / password123");

      await pool.query(
        `INSERT INTO govt_users (name, email, password_hash, role, centre_id, state)
         VALUES ($1, $2, $3, 'operator', $4, $5)
         ON CONFLICT (email) DO NOTHING`,
        ["Demo Operator", "operator@example.com", passwordHash, centreId, centre.state]
      );
      console.log("seeded demo govt operator: operator@example.com / password123");
    }
  }

  console.log("seed complete");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
