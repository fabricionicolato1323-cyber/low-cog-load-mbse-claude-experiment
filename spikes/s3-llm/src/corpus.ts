/**
 * S3 corpus: 20 engineering paragraphs written for this experiment (no external source).
 * Gold = statements a competent reviewer would expect as candidates. Quotes MUST be verbatim substrings
 * (enforced by test/corpus.test.ts). `alt` lists kinds also accepted (requirement/function boundary is fuzzy).
 * `ambiguous` = phrases a careful analyst should flag as needing clarification.
 */
export const KINDS = [
  "stakeholder",
  "objective",
  "requirement",
  "constraint",
  "assumption",
  "function",
  "system_element",
  "interface",
] as const;
export type Kind = (typeof KINDS)[number];

export interface GoldItem {
  kind: Kind;
  quote: string;
  alt?: Kind[];
}
export interface Paragraph {
  id: string;
  text: string;
  gold: GoldItem[];
  ambiguous: string[];
}

export const CORPUS: Paragraph[] = [
  {
    id: "P01-drone-delivery",
    text: "The city logistics office wants parcels delivered by drone to rooftop lockers within 30 minutes of order. Each drone shall carry up to 2 kg and shall land only on designated pads. Flights are not permitted above 120 metres under the aviation authority's rules. We assume that rooftop owners will grant access for the lockers. A dispatch service assigns orders to drones and receives battery status from each drone over the cellular link.",
    gold: [
      { kind: "stakeholder", quote: "The city logistics office" },
      { kind: "objective", quote: "parcels delivered by drone to rooftop lockers within 30 minutes of order", alt: ["requirement"] },
      { kind: "requirement", quote: "Each drone shall carry up to 2 kg" },
      { kind: "requirement", quote: "shall land only on designated pads", alt: ["constraint"] },
      { kind: "constraint", quote: "Flights are not permitted above 120 metres under the aviation authority's rules" },
      { kind: "assumption", quote: "rooftop owners will grant access for the lockers" },
      { kind: "system_element", quote: "A dispatch service", alt: ["function"] },
      { kind: "function", quote: "assigns orders to drones", alt: ["requirement"] },
      { kind: "interface", quote: "receives battery status from each drone over the cellular link" },
    ],
    ambiguous: [],
  },
  {
    id: "P02-infusion-pump",
    text: "Nurses on the oncology ward need an infusion pump that they can program quickly at the bedside. The pump shall deliver a programmed rate between 0.1 and 999 ml/h with an accuracy of plus or minus 5 percent. It must raise an audible alarm when an occlusion is detected. The pump must comply with IEC 60601-2-24. The drug library is loaded from the hospital pharmacy server before each shift.",
    gold: [
      { kind: "stakeholder", quote: "Nurses on the oncology ward" },
      { kind: "objective", quote: "an infusion pump that they can program quickly at the bedside" },
      { kind: "requirement", quote: "The pump shall deliver a programmed rate between 0.1 and 999 ml/h with an accuracy of plus or minus 5 percent" },
      { kind: "requirement", quote: "raise an audible alarm when an occlusion is detected", alt: ["function"] },
      { kind: "constraint", quote: "The pump must comply with IEC 60601-2-24" },
      { kind: "interface", quote: "The drug library is loaded from the hospital pharmacy server before each shift", alt: ["function"] },
      { kind: "system_element", quote: "hospital pharmacy server" },
    ],
    ambiguous: ["program quickly"],
  },
  {
    id: "P03-ground-station",
    text: "The satellite operator runs a ground station with two 7-metre antennas. Passes of low-earth-orbit satellites are scheduled by the mission planner. The antenna controller tracks the satellite during each pass and forwards the received telemetry to the archive. The station must be operable by a single technician per shift. The budget for the upgrade is capped at 1.2 million euros.",
    gold: [
      { kind: "stakeholder", quote: "The satellite operator" },
      { kind: "system_element", quote: "two 7-metre antennas" },
      { kind: "function", quote: "Passes of low-earth-orbit satellites are scheduled by the mission planner" },
      { kind: "system_element", quote: "mission planner" },
      { kind: "function", quote: "tracks the satellite during each pass" },
      { kind: "interface", quote: "forwards the received telemetry to the archive" },
      { kind: "requirement", quote: "The station must be operable by a single technician per shift", alt: ["constraint"] },
      { kind: "constraint", quote: "The budget for the upgrade is capped at 1.2 million euros" },
    ],
    ambiguous: [],
  },
  {
    id: "P04-rail-signalling",
    text: "Regional railway operators want to increase line capacity without building new track. The on-board unit reports its position to the trackside controller every second. The trackside controller shall grant movement authority only if the block ahead is confirmed clear. The system shall not rely on GPS alone for positioning. Safety assessors will require evidence at safety integrity level 4.",
    gold: [
      { kind: "stakeholder", quote: "Regional railway operators" },
      { kind: "objective", quote: "increase line capacity without building new track" },
      { kind: "interface", quote: "The on-board unit reports its position to the trackside controller every second" },
      { kind: "requirement", quote: "shall grant movement authority only if the block ahead is confirmed clear" },
      { kind: "requirement", quote: "The system shall not rely on GPS alone for positioning", alt: ["constraint"] },
      { kind: "stakeholder", quote: "Safety assessors" },
      { kind: "constraint", quote: "evidence at safety integrity level 4", alt: ["requirement"] },
    ],
    ambiguous: [],
  },
  {
    id: "P05-datacenter-cooling",
    text: "The facilities manager wants to cut cooling energy in the data hall by 20 percent. The cooling controller adjusts fan speed based on rack inlet temperatures. We expect that server load will remain roughly constant over the next two years. Rack inlet temperature must stay below 27 degrees Celsius. The chilled-water plant is owned by the landlord and cannot be modified.",
    gold: [
      { kind: "stakeholder", quote: "The facilities manager" },
      { kind: "objective", quote: "cut cooling energy in the data hall by 20 percent" },
      { kind: "function", quote: "adjusts fan speed based on rack inlet temperatures" },
      { kind: "system_element", quote: "The cooling controller" },
      { kind: "assumption", quote: "server load will remain roughly constant over the next two years" },
      { kind: "requirement", quote: "Rack inlet temperature must stay below 27 degrees Celsius", alt: ["constraint"] },
      { kind: "constraint", quote: "The chilled-water plant is owned by the landlord and cannot be modified" },
    ],
    ambiguous: ["roughly constant"],
  },
  {
    id: "P06-ev-depot",
    text: "A bus company is electrifying its depot with 40 chargers. Buses must be fully charged by 05:00 every morning. The depot manager needs to see which buses are late to charge. The energy management system limits total draw to the grid connection limit of 2 MW and sends a charging schedule to each charger. Charger vendors provide firmware updates quarterly.",
    gold: [
      { kind: "stakeholder", quote: "A bus company" },
      { kind: "system_element", quote: "40 chargers", alt: ["constraint"] },
      { kind: "requirement", quote: "Buses must be fully charged by 05:00 every morning" },
      { kind: "stakeholder", quote: "The depot manager" },
      { kind: "objective", quote: "to see which buses are late to charge", alt: ["requirement"] },
      { kind: "function", quote: "limits total draw to the grid connection limit of 2 MW", alt: ["requirement", "constraint"] },
      { kind: "interface", quote: "sends a charging schedule to each charger" },
      { kind: "stakeholder", quote: "Charger vendors" },
    ],
    ambiguous: [],
  },
  {
    id: "P07-hospital-robots",
    text: "Porters currently move linen and meals by hand between the kitchen and the wards. The hospital board wants autonomous carts to take over these trips at night. The carts shall use the existing lifts and shall stop when a person steps within 1 metre. The lift controller must confirm door status before a cart enters. Wi-Fi coverage is assumed to be adequate on all floors.",
    gold: [
      { kind: "stakeholder", quote: "Porters" },
      { kind: "stakeholder", quote: "The hospital board" },
      { kind: "objective", quote: "autonomous carts to take over these trips at night" },
      { kind: "requirement", quote: "shall use the existing lifts", alt: ["constraint"] },
      { kind: "requirement", quote: "shall stop when a person steps within 1 metre" },
      { kind: "interface", quote: "The lift controller must confirm door status before a cart enters" },
      { kind: "assumption", quote: "Wi-Fi coverage is assumed to be adequate on all floors" },
    ],
    ambiguous: ["adequate"],
  },
  {
    id: "P08-hvac-retrofit",
    text: "The building owner is retrofitting an office block built in 1985. Occupants complain that the third floor is too hot in summer. The new controller shall keep zone temperature within one degree of setpoint during working hours. Work on the roof plant may only happen on weekends. The building management system exposes temperature and damper data to the energy dashboard.",
    gold: [
      { kind: "stakeholder", quote: "The building owner" },
      { kind: "stakeholder", quote: "Occupants" },
      { kind: "requirement", quote: "keep zone temperature within one degree of setpoint during working hours" },
      { kind: "system_element", quote: "The new controller" },
      { kind: "constraint", quote: "Work on the roof plant may only happen on weekends" },
      { kind: "interface", quote: "exposes temperature and damper data to the energy dashboard" },
    ],
    ambiguous: ["too hot"],
  },
  {
    id: "P09-wind-monitoring",
    text: "Wind farm operators want early warning of gearbox faults so that repairs can be planned. Each turbine has vibration sensors on the gearbox. The condition monitoring server analyses vibration spectra and raises a warning at least 14 days before predicted failure. The server is hosted by the operator's IT department in a private cloud. Offshore weather windows for maintenance are assumed to be available about 60 percent of the time.",
    gold: [
      { kind: "stakeholder", quote: "Wind farm operators" },
      { kind: "objective", quote: "early warning of gearbox faults so that repairs can be planned" },
      { kind: "system_element", quote: "vibration sensors on the gearbox" },
      { kind: "function", quote: "analyses vibration spectra", alt: ["requirement"] },
      { kind: "requirement", quote: "raises a warning at least 14 days before predicted failure", alt: ["function"] },
      { kind: "stakeholder", quote: "operator's IT department" },
      { kind: "assumption", quote: "Offshore weather windows for maintenance are assumed to be available about 60 percent of the time" },
    ],
    ambiguous: [],
  },
  {
    id: "P10-water-treatment",
    text: "A municipal water utility must keep chlorine residual between 0.2 and 0.5 mg/l at every delivery point. Operators watch a SCADA screen to adjust dosing pumps. The utility wants to automate dosing control. Regulatory sampling must remain manual and be logged by the sampling technician. The SCADA system polls each chlorine analyser every 10 seconds.",
    gold: [
      { kind: "stakeholder", quote: "A municipal water utility" },
      { kind: "requirement", quote: "keep chlorine residual between 0.2 and 0.5 mg/l at every delivery point" },
      { kind: "stakeholder", quote: "Operators" },
      { kind: "objective", quote: "automate dosing control" },
      { kind: "constraint", quote: "Regulatory sampling must remain manual" },
      { kind: "interface", quote: "polls each chlorine analyser every 10 seconds" },
      { kind: "system_element", quote: "SCADA system" },
    ],
    ambiguous: [],
  },
  {
    id: "P11-braking-ambiguous",
    text: "The braking subsystem should be reliable and respond fast enough in emergencies. It has to work with the existing wheel-speed sensors. Drivers expect a reasonable pedal feel. The supplier will deliver the actuator soon.",
    gold: [
      { kind: "system_element", quote: "The braking subsystem" },
      { kind: "requirement", quote: "should be reliable and respond fast enough in emergencies" },
      { kind: "constraint", quote: "It has to work with the existing wheel-speed sensors", alt: ["interface", "requirement"] },
      { kind: "stakeholder", quote: "Drivers" },
      { kind: "requirement", quote: "a reasonable pedal feel" },
      { kind: "stakeholder", quote: "The supplier" },
    ],
    ambiguous: ["reliable", "fast enough", "reasonable pedal feel", "soon"],
  },
  {
    id: "P12-meeting-notes",
    text: "Notes from the kickoff: the client is worried about the schedule. Somebody should look into the sensor question. Maybe we can reuse last year's design if it still fits. Marketing wants it to look modern. Need to talk to the safety people at some point.",
    gold: [
      { kind: "stakeholder", quote: "the client" },
      { kind: "assumption", quote: "we can reuse last year's design if it still fits", alt: ["objective", "constraint"] },
      { kind: "stakeholder", quote: "Marketing" },
      { kind: "requirement", quote: "it to look modern", alt: ["objective"] },
      { kind: "stakeholder", quote: "the safety people" },
    ],
    ambiguous: ["the sensor question", "look modern", "some point", "if it still fits"],
  },
  {
    id: "P13-history-only",
    text: "The company was founded in 1962 by two brothers who had previously worked in the shipyards. Over the decades it moved from small mechanical parts to electronic assemblies. The headquarters relocated twice, first to the harbour district and later to the industrial park. The annual family picnic remains a tradition.",
    gold: [],
    ambiguous: [],
  },
  {
    id: "P14-negations",
    text: "The controller shall not accept commands from unauthenticated sources. Operators must not be able to disable the emergency stop from the touchscreen. The gateway does not store personal data. No firmware update shall be applied while the machine is running. We do not assume that the network is always available.",
    gold: [
      { kind: "requirement", quote: "The controller shall not accept commands from unauthenticated sources" },
      { kind: "requirement", quote: "Operators must not be able to disable the emergency stop from the touchscreen" },
      { kind: "requirement", quote: "The gateway does not store personal data", alt: ["constraint"] },
      { kind: "requirement", quote: "No firmware update shall be applied while the machine is running" },
      { kind: "assumption", quote: "We do not assume that the network is always available", alt: ["constraint"] },
    ],
    ambiguous: [],
  },
  {
    id: "P15-numeric",
    text: "The pick-and-place cell must place 120 components per minute with a positional error under 0.05 mm. Cycle time per component is 0.5 s. The vision camera captures 60 frames per second at 2 megapixels and sends each frame over Gigabit Ethernet to the vision controller. Cell footprint must not exceed 1.5 m by 2 m. Ambient temperature on the shop floor ranges from 15 to 35 degrees Celsius.",
    gold: [
      { kind: "requirement", quote: "must place 120 components per minute with a positional error under 0.05 mm" },
      { kind: "system_element", quote: "The vision camera" },
      { kind: "interface", quote: "sends each frame over Gigabit Ethernet to the vision controller" },
      { kind: "constraint", quote: "Cell footprint must not exceed 1.5 m by 2 m" },
      { kind: "constraint", quote: "Ambient temperature on the shop floor ranges from 15 to 35 degrees Celsius", alt: ["assumption", "requirement"] },
    ],
    ambiguous: [],
  },
  {
    id: "P16-passive-regulatory",
    text: "Records of every dose administered shall be retained for ten years. Access to the records is restricted to authorised clinical staff. Audit logs are to be reviewed monthly by the compliance officer. Data may not leave the national territory.",
    gold: [
      { kind: "requirement", quote: "Records of every dose administered shall be retained for ten years" },
      { kind: "requirement", quote: "Access to the records is restricted to authorised clinical staff", alt: ["constraint"] },
      { kind: "stakeholder", quote: "the compliance officer" },
      { kind: "requirement", quote: "Audit logs are to be reviewed monthly", alt: ["constraint", "function"] },
      { kind: "constraint", quote: "Data may not leave the national territory" },
    ],
    ambiguous: [],
  },
  {
    id: "P17-bullets",
    text: "Requirements from the customer workshop:\n- The kiosk supports card and mobile payment.\n- Receipts can be emailed or printed.\n- Downtime must not exceed 4 hours per year.\n- Software updates are installed remotely by the service team.\n- The kiosk is used by tourists who may not speak the local language.",
    gold: [
      { kind: "requirement", quote: "The kiosk supports card and mobile payment" },
      { kind: "requirement", quote: "Receipts can be emailed or printed" },
      { kind: "requirement", quote: "Downtime must not exceed 4 hours per year" },
      { kind: "function", quote: "Software updates are installed remotely by the service team", alt: ["requirement"] },
      { kind: "stakeholder", quote: "the service team" },
      { kind: "stakeholder", quote: "tourists" },
      { kind: "assumption", quote: "who may not speak the local language", alt: ["requirement"] },
    ],
    ambiguous: [],
  },
  {
    id: "P18-informal-email",
    text: "Hi all, quick one: the farm co-op wants us to monitor soil moisture in 200 fields. The gateway on each farm collects readings from the field probes over LoRa and pushes them to our cloud every 15 minutes. Farmers will only accept it if the battery lasts a full season. I think the LoRa range will be fine but nobody has tested it yet.",
    gold: [
      { kind: "stakeholder", quote: "the farm co-op" },
      { kind: "objective", quote: "monitor soil moisture in 200 fields" },
      { kind: "system_element", quote: "The gateway on each farm" },
      { kind: "interface", quote: "collects readings from the field probes over LoRa" },
      { kind: "interface", quote: "pushes them to our cloud every 15 minutes" },
      { kind: "stakeholder", quote: "Farmers" },
      { kind: "requirement", quote: "the battery lasts a full season" },
      { kind: "assumption", quote: "the LoRa range will be fine" },
    ],
    ambiguous: ["fine"],
  },
  {
    id: "P19-legacy-interfaces",
    text: "The legacy billing system exports a nightly CSV of invoices to the finance data warehouse. The warehouse sends approved payment runs back to billing through an SFTP drop folder. The customer portal reads invoice status from billing through a read-only REST service. No other system writes to the billing database.",
    gold: [
      { kind: "system_element", quote: "The legacy billing system" },
      { kind: "interface", quote: "exports a nightly CSV of invoices to the finance data warehouse" },
      { kind: "interface", quote: "sends approved payment runs back to billing through an SFTP drop folder" },
      { kind: "interface", quote: "reads invoice status from billing through a read-only REST service" },
      { kind: "constraint", quote: "No other system writes to the billing database", alt: ["requirement"] },
    ],
    ambiguous: [],
  },
  {
    id: "P20-assumption-risk",
    text: "The project depends on the university lab delivering the calibrated sensor prototypes by March. We are assuming the prototypes meet the datasheet accuracy, which has not been verified. If the certification body changes its test procedure, the schedule will slip. Test engineers must be able to reproduce each measurement from stored raw data.",
    gold: [
      { kind: "stakeholder", quote: "the university lab" },
      { kind: "assumption", quote: "the university lab delivering the calibrated sensor prototypes by March", alt: ["constraint"] },
      { kind: "assumption", quote: "the prototypes meet the datasheet accuracy" },
      { kind: "stakeholder", quote: "the certification body" },
      { kind: "stakeholder", quote: "Test engineers" },
      { kind: "requirement", quote: "must be able to reproduce each measurement from stored raw data" },
    ],
    ambiguous: [],
  },
];
