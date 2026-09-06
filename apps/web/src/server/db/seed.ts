import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";

const CENTRES = [
  { name: "Karnal Mandi", district: "Karnal", state: "Haryana" },
  { name: "Kurukshetra Mandi", district: "Kurukshetra", state: "Haryana" },
  { name: "Sirsa Mandi", district: "Sirsa", state: "Haryana" },
];

const CROPS = ["wheat", "paddy"];
const TIME_WINDOWS = ["09:00-11:00", "11:00-13:00", "14:00-16:00"];

async function main() {
  const { pool } = await import("./pool");

  for (const centre of CENTRES) {
    const { rows } = await pool.query(
      `INSERT INTO centres (name, state, district, crops)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name, state) DO UPDATE SET district = EXCLUDED.district
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
      const mpinHash = await bcrypt.hash("847291", 10);
      const govtTokenHash = await bcrypt.hash("841902", 10);

      const { rows: agentRows } = await pool.query(
        `INSERT INTO agents (
           name, phone, email, password_hash, license_number, mpin_hash, centre_id,
           firm_name, proprietor_name, pan, gstin, firm_address, registered_since,
           bank_name, bank_account_number, bank_ifsc, bank_branch, security_deposit,
           yard_shed, weighbridge_lanes, daily_capacity_qtl, license_issue_date, license_expiry_date
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
         ON CONFLICT (phone) DO UPDATE SET
           license_number = EXCLUDED.license_number, mpin_hash = EXCLUDED.mpin_hash,
           firm_name = EXCLUDED.firm_name, proprietor_name = EXCLUDED.proprietor_name,
           pan = EXCLUDED.pan, gstin = EXCLUDED.gstin, firm_address = EXCLUDED.firm_address,
           registered_since = EXCLUDED.registered_since, bank_name = EXCLUDED.bank_name,
           bank_account_number = EXCLUDED.bank_account_number, bank_ifsc = EXCLUDED.bank_ifsc,
           bank_branch = EXCLUDED.bank_branch, security_deposit = EXCLUDED.security_deposit,
           yard_shed = EXCLUDED.yard_shed, weighbridge_lanes = EXCLUDED.weighbridge_lanes,
           daily_capacity_qtl = EXCLUDED.daily_capacity_qtl, license_issue_date = EXCLUDED.license_issue_date,
           license_expiry_date = EXCLUDED.license_expiry_date
         RETURNING id`,
        [
          "Demo Agent", "9990001111", "agent@example.com", passwordHash, "PB-KHA-8841", mpinHash, centreId,
          "M/s Demo Agent & Sons", "Demo Agent", "AAACD1234K", "06AAACD1234K1ZP",
          "Shop No. 12, Block-A, Main Grain Market, Karnal, Haryana - 132001", "2005-06-01",
          "Punjab National Bank", "0048002100084920", "PUNB0004800", "Main Mall Road, Karnal",
          1500000, "Shed 04 (Bays 18-24)", "Lane 01 & Lane 02", 2500, "2020-04-01", "2029-03-31",
        ]
      );
      const demoAgentId = agentRows[0].id;
      console.log("seeded demo agent: license PB-KHA-8841 / phone 9990001111 / MPIN 847291");

      const DEMO_STAFF = [
        { name: "Gurpreet Singh", phone: "9876521443", role: "Head Accountant", scope: "Gate Pass Clearance & J-Form Sign" },
        { name: "Daljit Singh", phone: "9417288301", role: "Weighing Supervisor", scope: "Weighbridge Lane 02 Terminal Supervisor" },
        { name: "Mandeep Kumar", phone: "9888299014", role: "QC Coordinator", scope: "Gunny Bag Stock & Moisture Check" },
      ];
      for (const s of DEMO_STAFF) {
        await pool.query(
          `INSERT INTO agent_staff (agent_id, name, phone, role, authorization_scope)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (agent_id, phone) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, authorization_scope = EXCLUDED.authorization_scope`,
          [demoAgentId, s.name, s.phone, s.role, s.scope]
        );
      }
      console.log(`seeded ${DEMO_STAFF.length} demo agent staff members`);

      const DEMO_OFFICIALS = [
        { name: "Ravinder Singh Cheema", designation: "President, Karnal Arhtiya Association", phone: "01842267120", category: "association_president", officeHours: null },
        { name: "DMO Office Karnal Helpdesk", designation: "District Mandi Officer Helpdesk", phone: "01842267120", category: "helpdesk", officeHours: "09:00-17:00" },
        { name: "R.K. Sharma, PCS", designation: "Secretary, Market Committee Karnal", phone: null, category: "nodal_officer", officeHours: null },
      ];
      for (const o of DEMO_OFFICIALS) {
        await pool.query(
          `INSERT INTO mandi_officials (centre_id, name, designation, phone, category, office_hours)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (centre_id, name) DO UPDATE SET designation = EXCLUDED.designation, phone = EXCLUDED.phone`,
          [centreId, o.name, o.designation, o.phone, o.category, o.officeHours]
        );
      }
      console.log(`seeded ${DEMO_OFFICIALS.length} demo mandi officials (fictional civic directory)`);

      await pool.query(
        `INSERT INTO govt_users (name, email, password_hash, token_hash, role, centre_id, state)
         VALUES ($1, $2, $3, $4, 'operator', $5, $6)
         ON CONFLICT (email) DO UPDATE SET token_hash = EXCLUDED.token_hash`,
        ["Demo Operator", "operator@example.com", passwordHash, govtTokenHash, centreId, centre.state]
      );
      console.log("seeded demo govt operator: operator@example.com / password123 / token 841902");

      await pool.query(
        `INSERT INTO govt_users (name, email, password_hash, token_hash, role, centre_id, state)
         VALUES ($1, $2, $3, $4, 'oversight', NULL, $5)
         ON CONFLICT (email) DO UPDATE SET token_hash = EXCLUDED.token_hash`,
        ["Demo Oversight", "oversight@example.com", passwordHash, govtTokenHash, centre.state]
      );
      console.log("seeded demo govt oversight: oversight@example.com / password123 / token 841902");
    }
  }

  // Simulated PLRS registry fixtures for the agent add-farmer lookup flow.
  // Not real government records — synthetic demo data only.
  const PLRS_FIXTURES = [
    {
      mobile: "9814066231",
      mfmbId: "MFMB-PB-2026-904122",
      aadhaarLast4: "7743",
      name: "Harpreet Singh Dhillon",
      guardianName: "Jaswant Singh",
      village: "Manaawala",
      tehsil: "Baba Bakala",
      district: "Amritsar",
      state: "Punjab",
      pincode: "143115",
      holdingCategory: "Smallholder Farmer",
      landAcres: 6.5,
      bankName: "Punjab National Bank",
      bankAccountLast4: "8821",
      bankIfsc: "PUNB0123400",
      landParcels: [
        { khewatKhatauni: "56 / 112", khasraNumber: "18//4, 19//2", areaAcres: 4.2, crop: "wheat", variety: "HD-2967", estimatedYieldQtl: 165.0 },
        { khewatKhatauni: "58 / 114", khasraNumber: "22//6", areaAcres: 2.3, crop: "wheat", variety: "DBW-187", estimatedYieldQtl: 85.0 },
      ],
    },
    {
      mobile: "9876543210",
      mfmbId: "MFMB-PB-2026-118820",
      aadhaarLast4: "3391",
      name: "Gurpreet Kaur Sidhu",
      guardianName: "Balwinder Singh Sidhu",
      village: "Rasoolpur",
      tehsil: "Tarn Taran",
      district: "Tarn Taran",
      state: "Punjab",
      pincode: "143401",
      holdingCategory: "Marginal Farmer",
      landAcres: 3.1,
      bankName: "State Bank of India",
      bankAccountLast4: "4417",
      bankIfsc: "SBIN0005678",
      landParcels: [
        { khewatKhatauni: "22 / 47", khasraNumber: "9//1", areaAcres: 3.1, crop: "wheat", variety: "PBW-725", estimatedYieldQtl: 118.0 },
      ],
    },
    {
      mobile: "9988776655",
      mfmbId: "MFMB-PB-2026-227731",
      aadhaarLast4: "6082",
      name: "Ranjit Singh Brar",
      guardianName: "Mohinder Singh Brar",
      village: "Kot Ise Khan",
      tehsil: "Moga",
      district: "Moga",
      state: "Punjab",
      pincode: "142053",
      holdingCategory: "Large Farmer",
      landAcres: 14.8,
      bankName: "HDFC Bank",
      bankAccountLast4: "5509",
      bankIfsc: "HDFC0001122",
      landParcels: [
        { khewatKhatauni: "101 / 210", khasraNumber: "31//2, 32//1", areaAcres: 8.5, crop: "wheat", variety: "HD-3086", estimatedYieldQtl: 340.0 },
        { khewatKhatauni: "103 / 214", khasraNumber: "34//5", areaAcres: 6.3, crop: "wheat", variety: "PBW-343", estimatedYieldQtl: 245.0 },
      ],
    },
  ];

  for (const f of PLRS_FIXTURES) {
    await pool.query(
      `INSERT INTO plrs_demo_registry
         (mobile, mfmb_id, aadhaar_last4, name, guardian_name, village, tehsil, district, state, pincode, holding_category, land_acres, bank_name, bank_account_last4, bank_ifsc, land_parcels)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (mobile) DO UPDATE SET
         mfmb_id = EXCLUDED.mfmb_id, name = EXCLUDED.name, land_parcels = EXCLUDED.land_parcels`,
      [
        f.mobile, f.mfmbId, f.aadhaarLast4, f.name, f.guardianName, f.village, f.tehsil, f.district, f.state, f.pincode,
        f.holdingCategory, f.landAcres, f.bankName, f.bankAccountLast4, f.bankIfsc, JSON.stringify(f.landParcels),
      ]
    );
  }
  console.log(`seeded ${PLRS_FIXTURES.length} simulated PLRS registry fixtures (demo data)`);

  console.log("seed complete");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
