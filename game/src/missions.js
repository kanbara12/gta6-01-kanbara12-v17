// The 8-job campaign of SUNCOAST: HEATLINE.
// Payouts are tuned so the cash checkpoints match the story exactly:
// start $1,250 → after job 1 $3,750 → after job 3 $9,550 → after job 4
// $13,200 → final $22,450. Starting cash $1,250 plus payouts $21,200.
import { money } from './util.js';

export const START_CASH = 1250;

export const MISSIONS = [
  { id: 1, title: 'Pier Pickup', fixer: 'Rae', payout: 2500, wanted: 0, onFoot: false,
    pickup: { x: -138, z: 30, label: 'Pick up the cargo at the pier' },
    dropoff: { x: 24, z: -60, label: 'Deliver the cargo to Rae\u2019s garage' } },
  { id: 2, title: 'Beachfront Courier', fixer: 'Rae', payout: 2500, wanted: 1, onFoot: false,
    pickup: { x: -44, z: 120, label: 'Collect the package on Ocean Ave' },
    dropoff: { x: 60, z: -120, label: 'Drop it at the beach house' } },
  { id: 3, title: 'Downtown Crates', fixer: 'Sable', payout: 3300, wanted: 1, onFoot: false,
    pickup: { x: 90, z: 90, label: 'Load the crates downtown' },
    dropoff: { x: -44, z: -140, label: 'Deliver to the north pier' } },
  { id: 4, title: 'Yard Sweep', fixer: 'Marlo', payout: 3650, wanted: 2, onFoot: true,
    pickup: { x: 20, z: 30, label: 'Reach the yard on foot' },
    dropoff: { x: 20, z: 30, label: 'Clear the yard: take down 3 targets' } },
  { id: 5, title: 'Ocean Ave Getaway', fixer: 'Rae', payout: 2400, wanted: 3, onFoot: false,
    pickup: { x: -44, z: -150, label: 'Grab the bag on Ocean Ave' },
    dropoff: { x: -44, z: 150, label: 'Lose the heat — reach the south end' } },
  { id: 6, title: 'Marina Run', fixer: 'Sable', payout: 2300, wanted: 2, onFoot: false,
    pickup: { x: 120, z: -30, label: 'Pick up at the marina' },
    dropoff: { x: -44, z: 60, label: 'Deliver to the boardwalk' } },
  { id: 7, title: 'Rooftop Handoff', fixer: 'Marlo', payout: 2300, wanted: 2, onFoot: false,
    pickup: { x: 60, z: 120, label: 'Collect the rooftop case' },
    dropoff: { x: 130, z: -90, label: 'Hand it off east side' } },
  { id: 8, title: 'The Heatline', fixer: 'Rae', payout: 2250, wanted: 3, onFoot: false,
    pickup: { x: -138, z: 30, label: 'One last pickup at the pier' },
    dropoff: { x: 60, z: 0, label: 'Final drop — downtown plaza' } },
];

/** Fresh campaign state. */
export function createMissionState() {
  return {
    jobIndex: 0, // 0-based; HUD shows jobIndex + 1
    cash: START_CASH,
    rep: 0,
    phase: 'pickup', // 'pickup' | 'dropoff' | 'campaignDone'
    driftChains: 0,
    driftBonus: 0,
    targetsDown: 0,
    targetsTotal: 0,
    wanted: 0,
    carrying: false,
  };
}

/** The mission the player is on now (or null once the campaign is done). */
export function currentMission(state) {
  return state.jobIndex < MISSIONS.length ? MISSIONS[state.jobIndex] : null;
}

/** Cash the player holds after `jobIndex` jobs are complete (for checkpoints). */
export function cashAfterJobs(jobIndex) {
  let cash = START_CASH;
  for (let i = 0; i < jobIndex && i < MISSIONS.length; i++) cash += MISSIONS[i].payout;
  return cash;
}

/** Complete the current job: pay out, advance the job, raise REP. Returns the payout. */
export function completeJob(state) {
  const mission = currentMission(state);
  if (!mission) return 0;
  state.cash += mission.payout;
  state.jobIndex += 1;
  state.rep += 1;
  state.phase = 'pickup';
  state.carrying = false;
  state.wanted = 0;
  state.targetsDown = 0;
  state.targetsTotal = 0;
  return mission.payout;
}

/** A drift chain pays $50 a link; call when a drift ends. */
export function bankDrift(state, chains) {
  const bonus = chains * 50;
  state.driftChains += chains;
  state.driftBonus += bonus;
  state.cash += bonus;
  return bonus;
}

/** Short HUD label for the current objective. */
export function objectiveText(state) {
  const mission = currentMission(state);
  if (!mission) return 'Campaign complete — Suncoast is yours. $22,450 banked.';
  const point = state.phase === 'pickup' ? mission.pickup : mission.dropoff;
  return `JOB ${mission.id}: ${point.label} — pays ${money(mission.payout)}.`;
}
