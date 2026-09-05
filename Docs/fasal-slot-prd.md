# Fasal Slot — Complete Product Requirements Document

**Product:** Fasal Slot — Slot Booking and Queue Visibility Platform for MSP Crop Procurement
**Version:** v1.0
**Status:** Ready for implementation
**Owner:** Gursimran
**Last updated:** September 2026

---

## Part 1 — Problem

### 1.1 Executive Summary

India runs one of the largest state-managed purchasing operations in the world, buying crops from close to two crore farmers at a guaranteed Minimum Support Price every year, worth over Rs 3.33 lakh crore, to feed a food security system that roughly 81 crore people depend on monthly. The government has digitised farmer eligibility and payment for this system. It has not digitised the one moment that actually determines whether a farmer has a good or bad experience: the day their crop physically arrives at the procurement centre. That gap produces recurring, documented, multi-day waits, income loss, and coordination failure, every season, at some of the largest grain markets in the country.

### 1.2 Background: How Farmers Sell Crops in India

India has 146.5 million operational holdings (separately farmed land parcels, per the 2015-16 Agriculture Census — the closest available proxy for a farmer count), and roughly 86 percent of them are under two hectares, classified as small or marginal. Agriculture and allied activities employ 46.1 percent of India's total workforce as of 2023-24.

A farmer with a harvest to sell has four routes: selling to a local trader, auctioning through an APMC mandi via a commission agent, pooling through a cooperative, or selling directly to a government agency at MSP. The MSP route is the only one that guarantees a floor price regardless of what the open market is doing. For a small or marginal farmer who needs cash immediately to repay a crop loan or fund the next season's inputs, it is often not a preference among equals — it is the only route that reliably avoids a loss.

### 1.3 Why the Government Procures Crops

Government procurement serves two simultaneous mandates. The first is price protection for farmers, preventing distress sales during bumper harvests when open market prices fall below the cost of production.

The second, and larger in financial terms, is feeding the country's food security system. Everything procured becomes the supply for the Targeted Public Distribution System under the National Food Security Act, which covers roughly 81 crore people, about 75 percent of India's rural population and 50 percent of its urban population, receiving subsidised or fully free grain every month through December 2028. To guarantee that supply even in a poor harvest year, the government holds a mandatory buffer stock at all times. As of April 1, 2026, the central pool held 604 lakh tonnes of wheat and rice combined, against a mandatory norm of 210 lakh tonnes.

Food subsidy — the cost of buying at MSP and selling at a much lower price through PDS — was budgeted at roughly Rs 2.05 lakh crore for both 2024-25 and 2025-26, more than half of all government subsidy spending in FY25. The free grain scheme alone carries an estimated Rs 11.8 lakh crore outlay across five years.

Procurement is not a seasonal convenience. It is the annual refill of a strategic reserve that over half the country depends on every month, executed through thousands of physical centres.

### 1.4 Scale in Numbers

| Metric | Figure |
|---|---|
| Farmers benefiting from MSP procurement, 2021-22 | 1.63 crore |
| Farmers benefiting from MSP procurement, 2024-25 | 1.84 crore |
| Total MSP value paid, 2021-22 | Rs 2.25 lakh crore |
| Total MSP value paid, 2024-25 | Rs 3.33 lakh crore |
| Total foodgrain procured, 2014-15 | 761.4 lakh metric tonnes |
| Total foodgrain procured, 2024-25 | ~1,175 lakh metric tonnes |
| Wheat procured, RMS 2024-25 | 266 lakh MT, 22.3 lakh farmers, Rs ~60,000 crore paid |
| Paddy procured, KMS 2023-24 | 728-775 lakh MT, ~1 crore farmers, Rs 1.6-1.74 lakh crore paid |
| Central pool stock, April 2026 | 604 lakh tonnes vs 210 lakh tonne norm |
| Annual food subsidy budget | ~Rs 2.05 lakh crore |
| People fed through NFSA | ~81 crore |

Farmer participation, procurement volume, and MSP payouts have all grown every year for a decade. The population exposed to the coordination problem grows every season.

### 1.5 The Problem Statement

**When a farmer's crop is ready and they bring it to a government procurement centre to sell at MSP, the physical process of arriving, queuing, and being received is coordinated manually, with no reliable visibility for the farmer or the centre into timing, queue position, or capacity.**

This is distinct from the parts of the system that already work: eligibility registration (Meri Fasal Mera Byora, e-Kharid, e-Samriddhi, e-Samyukti) and payment (direct benefit transfer). None of that infrastructure tells the farmer when to actually show up, or tells the centre how many farmers are inbound and whether it has room to receive them.

### 1.6 Documented Evidence of the Failure

Field reporting from mandis across Punjab, Haryana, and Madhya Pradesh, every procurement season 2021 through 2026, describes the same pattern recurring in different towns and different years:

- **Karnal, Haryana:** officials confirmed that even after directives to accelerate lifting, roughly half of already-procured wheat sat unlifted in the mandi, leaving no capacity to receive the next arriving trolley.
- **Kurukshetra, Haryana:** farmers who registered on the state crop portal specifically to receive an SMS with their arrival schedule reported never receiving one, and brought their harvest to the mandi anyway because they had no on-farm storage.
- **Amritsar, Punjab (Bhagtanwala mandi):** a farmer was told repeatedly that procurement would begin "the next day," resulting in a second night at the mandi with an unsold trolley of wheat.
- **Sirsa district, Haryana:** farmers reported waiting up to five days at a procurement centre without a single purchase taking place.
- **Haryana mandi portal outage:** halted mandatory electronic gate pass issuance for roughly three hours, backing up traffic on approach roads.
- **Dabwali, Punjab:** three moisture testing machines run by three agencies at the same centre returned readings of 16.2%, 21.8%, and 17.4% for the same batch — a farmer could not know in advance whether their crop would be accepted that day.

The cost falls hardest on small and marginal farmers. A large farmer with storage and cash reserves can hold produce and wait. A small farmer — 86% of all holdings — selling into MSP precisely because they need cash immediately cannot afford two to three lost days at a mandi, and cannot afford the moisture-linked rejection that comes from a crop left exposed that long.

### 1.7 Root Cause

The government invested successfully in two categories of digitisation: proving eligibility (registration, land verification) and moving money (DBT payment). It did not build the coordination layer between them — the operational infrastructure for managing the physical event of a farmer's produce arriving at a centre on a specific day. Registration establishes that a farmer is allowed to sell. It does not coordinate when they should sell, relative to how many other farmers are also arriving and how much lifting capacity the centre has that day.

### 1.8 Impact of Not Solving This

- Farmer income loss through moisture-linked rejection and spoilage from multi-day exposure, plus the opportunity cost of two to five lost working days per sale.
- Operational strain for procuring agencies who learn about backlogs through protests or press coverage rather than a live operational view.
- Growing exposure year over year, since participation and volume grow while coordination infrastructure stays manual.
- Downstream risk to the buffer stock and PDS supply chain if lifting delays slow the pace at which procured grain enters the central pool during peak season.

---

## Part 2 — Solution

### 2.1 Solution Summary

Fasal Slot is a web-based slot booking and queue visibility platform that gives every party in the MSP procurement chain — the farmer, the agent who often sells on their behalf, and the government agency receiving the crop — a shared, live view of arrival slots, queue position, and sale status.

It does not replace the registration or payment systems that already work. It fills the one gap those systems leave: nobody today knows when to show up, how long the wait actually is, or whether the centre can receive them, until they are already standing in it.

The platform is a web application. There is no mobile app in v1. The farmer's self-serve option is a mobile-friendly web page opened from a link. The farmer's primary channel remains a phone call to their agent or a government helpline, with SMS and WhatsApp for confirmations and updates. Every capability the platform offers must be fully usable through phone call and SMS alone.

### 2.2 Goals

1. Give every farmer a specific, bookable arrival slot, reachable through a phone call, SMS, WhatsApp, or a mobile-friendly web page — in that order of accessibility.
2. Give procurement centre and government staff a live, cross-centre view of how many farmers are booked, arrived, and waiting, so backlog is visible before it becomes a protest or a news story.
3. Cut the average farmer wait time at the centre materially below the one to five days documented in the discovery evidence.
4. Preserve the agent's existing role as an aggregator and intermediary by giving agents a tool to book and manage slots for many farmers at once.
5. Make procurement and payment status visible end-to-end, from booked slot through weighment, quality check, and final payment, in one place, for whichever party is checking it.

### 2.3 Non-Goals (v1)

1. Replacing registration, land verification, or payment systems — Meri Fasal Mera Byora, e-Kharid, e-Samriddhi, e-Samyukti, and DBT already do this. This platform reads from and writes status back to those systems where possible.
2. Quality testing hardware or methodology — a metrology and process issue, not a software visibility issue.
3. Open market, private trader, or e-NAM transactions — scoped to MSP government procurement only.
4. Full price discovery or bidding — MSP is a fixed announced price.
5. On-farm storage or logistics solutions.
6. Loan, credit, or input financing features.

### 2.4 Personas

#### Farmer
Small or marginal landholder. Selling into MSP because it is often the only route that avoids a loss. Assume: a basic phone often shared within the household, variable literacy, low comfort with self-service software. Primary channel: phone call to agent or government helpline. SMS and WhatsApp for confirmations. Web page as secondary for the smaller share comfortable with one.

#### Agent (Arhtiya/Commission Agent)
Sits between farmers and the procuring agency in real market practice. Comfortable with a smartphone. Handles volume, not a single transaction. Financially motivated to get this right. Primary channel: web tool usable on phone and desktop browser.

#### Government Agency Staff (two sub-roles)
- **Centre operator:** runs a single procurement centre day-to-day. Needs a live queue view and capacity controls. Primary tool: web dashboard.
- **Oversight official:** oversees multiple centres (FCI, state civil supplies corporations, NAFED, NCCF, HAFED). Needs a cross-centre rollup and backlog risk view. Primary tool: web dashboard.

### 2.5 User Stories

**Farmer**
- As a farmer, I want to book a slot by calling my agent or a government helpline, so that I do not need to use a web page to get a confirmed time.
- As a farmer, I want to receive an SMS or WhatsApp message confirming my slot in my own language, so I know exactly when to bring my crop.
- As a farmer, I want to call a number or reply to a message to check my current position in the queue, so I can decide when to leave for the centre instead of waiting there.
- As a farmer, I want to be notified if my slot changes or is delayed, so I do not travel to the centre and then wait unnecessarily.
- As a farmer who uses a smartphone, I want a simple web page where I can book my own slot and track my status directly.
- As a farmer, I want to know once my crop has been weighed and accepted, and again once payment has been made, so I have a clear record without asking my agent repeatedly.

**Agent**
- As an agent, I want to register and book slots for multiple farmers at once in a single flow, so I do not have to repeat the process one farmer at a time.
- As an agent, I want a list view of all the farmers I represent with their slot, queue status, and sale status visible together, so I can manage my day and answer farmer questions without calling the centre.
- As an agent, I want to be notified if a centre reduces its capacity or delays a slot I have booked for a farmer, so I can inform that farmer before they travel.
- As an agent, I want to see which batches have completed sale and payment, so I can reconcile my commission against completed transactions.

**Government agency staff**
- As a centre operator, I want to see how many farmers are booked for today and how many have arrived, so I can plan intake and staffing accordingly.
- As a centre operator, I want to adjust available slots in real time if lifting is running behind schedule, so I do not accept more arrivals than I can process that day.
- As a state-level procurement official, I want a rollup view across all centres in my jurisdiction, so I can identify which centres are heading toward the kind of backlog seen in Karnal before it becomes a crisis.
- As a government staff member, I want to mark a farmer's crop as received, quality checked, and paid, so the farmer and their agent see accurate status without asking a person at the centre.

### 2.6 Core Application Flow

**Stage 1 — Registration.** A farmer exists in the system before any slot is booked. Registration can happen through an agent during a call or in person, through a government helpline operator over the phone, or by a smartphone farmer on the web page. Registration captures identity, land and crop details (pulled from existing state portals where possible, so farmers confirm rather than retype), phone number, preferred language, and which agent is authorised to act on their behalf. A farmer with no agent is valid and fully supported.

**Stage 2 — Slot booking.** A slot at a specific centre for a specific day and time window is booked. The system checks that centre's remaining capacity and either confirms the slot or offers the next available day. On confirmation, an SMS and, where available, a WhatsApp message go to the farmer in their language.

**Stage 3 — Pre-arrival.** Between booking and the slot day, the farmer can check their booking and current expected queue status through any channel: web page, reply to a WhatsApp message, calling the IVR, or calling their agent. If the centre reduces capacity or the slot shifts, an automatic notification goes out on SMS and WhatsApp.

**Stage 4 — Arrival and queue.** The farmer arrives at the centre. Staff mark them arrived by looking up the booking using phone number, name, or the reference code from the confirmation message. The farmer's live queue position is now visible to them, their agent, and centre staff.

**Stage 5 — Weighment and quality check.** The crop is weighed and quality tested. Staff record the outcome. Status moves to weighed, then to accepted or rejected. If rejected, the recorded reason is included and the farmer is offered a clear next step: rebook at the same or another centre. Every status change notifies the farmer and their agent automatically.

**Stage 6 — Payment.** Once accepted, payment is processed through the existing direct benefit transfer rail, which this platform reads status from but does not replace. When payment is confirmed, a final notification goes to the farmer and agent, closing the loop.

### 2.7 Status Lifecycle

Five stages, used identically across all channels and all personas:

**Booked → Arrived → Weighed → Accepted → Paid**

Rejected is a branch from Weighed (not a separate linear stage) and always includes a recorded reason plus a rebooking path.

The same five stage labels, icons, and colours are used across the farmer web page, agent tool, and government dashboard. A stage never looks like one thing to a farmer and another to an operator.

### 2.8 Information Architecture

**Core objects:**
- **Farmer:** identity, phone, preferred language, land/crop details, authorised agent
- **Agent:** identity, contact, list of authorised farmers
- **Centre:** location, crops procured, bookable capacity per day and per time window
- **Booking:** links one farmer to one centre on one day for one crop and one time window; carries status through the lifecycle
- **Status event:** each transition with timestamp and who triggered it

**Navigation by persona:**

| Persona | Top-level views | Underlying object |
|---|---|---|
| Farmer (web) | Home (current booking), Book a slot, My status, Help | Their Farmer and its Bookings |
| Farmer (SMS, WhatsApp, IVR) | Confirmations, reminders, status replies | Their Bookings and Status events |
| Agent | My farmers (today/upcoming), Book slots, Add farmer, Farmer detail, Reconciliation | Their authorised Farmers and their Bookings |
| Centre operator | Live centre view, capacity control, queue actions | One Centre and its Bookings for the day |
| Oversight official | All centres rollup, centre drill-down, season trend | Many Centres and aggregate Status events |

### 2.9 Language Support

The platform supports English, Hindi, and Punjabi across all farmer-facing and agent-facing surfaces: the web interface, every SMS template, every WhatsApp message, and every IVR prompt.

Language is a property of the person, not the device or the session. It is captured once at registration and reused on every channel. Changing it on the web page updates the stored language for SMS, WhatsApp, and IVR. The government dashboard is English only in v1. Dates always include the day of week spelled out. Numerals use the convention matching the selected language.

### 2.10 Visual and Accessibility Standards

For farmer-facing surfaces only (not the government dashboard):
- Minimum button height 60px, touch targets large enough for calloused outdoor hands
- All text and interactive elements meet high-contrast standards for direct sunlight legibility. Light grey on white is explicitly disallowed.
- Status indicators use text label plus distinct icon, never colour alone. Colourblind and low-quality screen safe.
- Icons always paired with a text label in the farmer's language. Icons reinforce, they do not replace words.
- One primary action per screen, at most one secondary action.
- Back always returns to Home in one action.

### 2.11 Requirements

#### P0 — Must have for v1

| Feature | Acceptance criteria |
|---|---|
| Farmer and agent registration | A farmer can be registered by an agent, by a helpline operator, or by themselves on the web page; the same farmer record is used regardless of channel. Portal data pull attempted first; fallback is assisted registration. |
| Slot booking, capacity-aware | System never allows bookings beyond a centre's set capacity for a given day and time window. Shows the next available slot when the requested slot is full. |
| SMS and WhatsApp notifications | A farmer with only a basic phone number receives a clear SMS confirmation with slot day (with day of week spelled out), time window, and centre name, in their language, without needing the web page at all. |
| Live queue and status visibility | A farmer or agent can check current queue position and estimated wait via web page, SMS keyword, IVR, or by calling their agent. Queue position is accurate to within a defined tolerance, validated against staff records during pilot. |
| Government centre dashboard | Centre operator sees live counts of booked, arrived, weighed, accepted, rejected, and paid farmers for the day, and can advance each farmer's status with one action plus confirmation for consequential actions. |
| Government cross-centre rollup | A state-level official can identify, without visiting or calling, which centres are trending toward a Karnal-style backlog. |
| Procurement status end-to-end | A farmer or agent can see the current of 5 stages for any sale at any time through their available channel, and receives a notification on each stage change. |
| Agent batch booking with time selection | An agent can book slots for multiple farmers at once, selecting centre, crop, day, and time window. System checks capacity for the whole batch and never silently partially books. |
| Staff login (agent and government) | Email + password or phone + OTP login gate for agent and government surfaces. Farmer surface uses phone + OTP only. |

#### P1 — High-value fast follows

- WhatsApp as a two-way channel: farmer can reply to check status conversationally
- Government or centre-level IVR and helpline number, staffed or automated
- Agent reconciliation view: commission/transaction records tied to completed sales
- Multilingual voice prompts on the IVR line
- No-show and cancellation analytics for government staff
- Undo window for high-frequency government operator actions (mark arrived, weighed, accepted) instead of blocking pre-confirmation; reject and capacity-lower below booked count still require explicit confirmation

#### P2 — Deferred, designed for

- Predictive slot suggestions based on historical arrival and lifting patterns
- Deeper integration with e-NAM or AgriStack
- Offline or low-connectivity resilience for the web page
- Automated backlog alerts escalating to officials when a centre's unlifted stock crosses a threshold
- Native mobile app (revisit only if the web page proves insufficient for offline use or push notifications)

### 2.12 Success Metrics

**Leading indicators (weeks after pilot launch)**
- Share of bookings made through assisted channels (call/SMS/WhatsApp) vs. web page
- Agent adoption: share of registered agents in the pilot area who have booked at least one slot
- Average time between booked slot and actual arrival (proxy for booking credibility)
- No-show rate against booked slots
- SMS and WhatsApp confirmation delivery success rate

**Lagging indicators (over a season)**
- Reduction in average time from farmer arrival to completed sale vs. the 1-5 day baseline
- Reduction in moisture-linked rejection incidents tied to prolonged exposure
- Reduction in unlifted backlog volume at pilot centres vs. the same season in a prior year
- Farmer and agent satisfaction, gathered through a post-sale SMS survey

**Target-setting:** the pilot's first season is the baseline measurement. Explicit season-over-season improvement targets are set only after that first data set exists.

### 2.13 Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| Can the platform get API or data-sharing access to Meri Fasal Mera Byora, or must farmer/land data be recollected? | Product + government contact | Yes |
| Who bears the cost of SMS and WhatsApp Business API messaging at peak-season volume? | Product + finance | Yes |
| Will any procurement agency mandate this system, or is it optional alongside the existing manual process? | Product + government contact | Yes |
| What language and dialect coverage is needed for the pilot region? | Product + local field team | Yes |
| Does WhatsApp Business API require specific compliance or data-localisation steps for storing farmer phone numbers and messages? | Product + legal | Yes |

---

## Part 3 — Prototype

### 3.1 What the Prototype Covers

The working prototype at `msp-procurement-prototype.jsx` is a single-file React application covering all three roles fully: Farmer web page, Agent web tool, and Government dashboard. It demonstrates every flow specified in Part 2, with in-memory state (resets on reload).

**Role switcher:** top bar with Farmer / Agent / Government tabs.

**Farmer flow:**
- Full-page desktop split-layout welcome screen: SVG farm scene on the left, language selection on the right
- Three-language support (English, Hindi, Punjabi) with animated step transitions
- Phone + OTP login (demo code: 1234)
- Home screen: either a farm-scene illustrated empty state (no booking) or a physical token slip showing slot day, time, centre, and serial number when a booking exists
- Booking flow: crop → centre → day → time → confirm (4 guided steps, one decision per screen)
- Status detail: five-stage stamped progression rail, text + icon for every stage
- Rejection path: explicit reason shown, "Book again" button
- Call for help button on every farmer screen

**Agent flow:**
- Email + password or phone + OTP login
- Working list of farmers with today's slot and live status
- Batch booking: select multiple farmers, choose centre, crop, day, and time window; capacity-check enforced; no silent partial booking
- Add farmer with consent checkbox
- Farmer detail with live status and cancel booking (with notification)
- Reconciliation view for completed sales

**Government flow:**
- Email + password or phone + OTP login
- Centre view: live counter strip (booked/arrived/weighed/accepted/paid/rejected), live queue in arrival order, waiting-to-arrive list, capacity control (raise/lower)
- Consequential actions (reject, lower capacity below booked count) require explicit confirmation with recorded reason; routine actions (arrived, weighed, accepted, payment) commit immediately with a 5-second undo window
- All actions send the corresponding notification
- Oversight view: all centres with a backlog risk badge (Low/Watch/High), one tap to drill into a centre

### 3.2 What the Prototype Does Not Do

- Send real SMS or WhatsApp messages (notifications are simulated in the prototype, labelled as such)
- Connect to a real database or authentication system
- Integrate with Meri Fasal Mera Byora, e-Kharid, or DBT
- Persist state across reloads
- Run a real IVR or phone call

All of the above are implemented in the full application per the implementation plan in the companion document.

---

## Part 4 — Appendix

### 4.1 Sources

- Ministry of Consumer Affairs, Food and Public Distribution, via PIB, October 2025 — farmer participation and MSP value paid, 2021-22 through 2024-25
- Economic Survey 2024-25 — agricultural workforce share
- Agriculture Census 2015-16 — operational holdings and size distribution
- Food Corporation of India central pool stock data, April 2026, and buffer norms
- Union Budget food subsidy allocations, 2024-25 and 2025-26; PM Garib Kalyan Anna Yojana outlay
- Field reporting on procurement centre conditions in Karnal, Kurukshetra, Amritsar, Sirsa, and Dabwali, 2021-2026

### 4.2 Glossary

- **MSP:** Minimum Support Price — the floor price announced by the central government at which it agrees to buy specific crops from farmers
- **APMC:** Agricultural Produce Market Committee — state-regulated wholesale market
- **Arhtiya:** commission agent who sits between farmers and buyers in mandi trade
- **FCI:** Food Corporation of India — the central government's primary grain procurement and storage agency
- **NAFED:** National Agricultural Cooperative Marketing Federation — procures pulses, oilseeds, and copra under PM AASHA
- **DBT:** Direct Benefit Transfer — the mechanism that sends MSP payment directly to a farmer's bank account
- **RMS:** Rabi Marketing Season — wheat procurement season, roughly April-June
- **KMS:** Kharif Marketing Season — paddy procurement season, roughly October-January
- **MFMB:** Meri Fasal Mera Byora — Haryana's farmer registration and crop-declaration portal
