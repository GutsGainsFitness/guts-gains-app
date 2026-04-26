/**
 * Invite tier system — single source of truth.
 *
 * Tiers are evaluated by counting confirmed intakes/purchases for an inviter.
 * Each tier maps to one achievement key (mirrored in the `achievements` catalog).
 */

export type InviteTierKey = "invite_bronze" | "invite_silver" | "invite_gold" | "invite_platinum";

export interface InviteTier {
  key: InviteTierKey;
  label: string;
  metric: "intakes" | "purchases";
  threshold: number;
  reward: string;
  /** Lucide icon name — kept as string so it can be used in shared logic. */
  icon: "UserPlus" | "Users" | "Trophy" | "Crown";
}

export const INVITE_TIERS: InviteTier[] = [
  { key: "invite_bronze",   label: "Bronze Recruiter", metric: "intakes",   threshold: 1, reward: "Shoutout op Instagram",                  icon: "UserPlus" },
  { key: "invite_silver",   label: "Silver Connector", metric: "intakes",   threshold: 3, reward: "Gratis bootcamp sessie",                 icon: "Users" },
  { key: "invite_gold",     label: "Gold Scout",       metric: "purchases", threshold: 1, reward: "Gratis 1-op-1 PT sessie",                icon: "Trophy" },
  { key: "invite_platinum", label: "Platinum Mogul",   metric: "purchases", threshold: 5, reward: "Merch pack + 3 PT sessies",              icon: "Crown" },
];

/** Returns all tier keys earned given the inviter's stats. */
export function earnedInviteTiers(stats: { intakes: number; purchases: number }): InviteTierKey[] {
  return INVITE_TIERS.filter((t) =>
    t.metric === "intakes"
      ? stats.intakes >= t.threshold
      : stats.purchases >= t.threshold,
  ).map((t) => t.key);
}

/** Which tier (if any) does this single invite confirmation potentially unlock? */
export function tierForCount(metric: "intakes" | "purchases", count: number): InviteTierKey | null {
  // Highest-threshold matching tier for this metric whose threshold equals the new count.
  // Used to detect "just crossed" moments without requiring a recount.
  const matches = INVITE_TIERS.filter((t) => t.metric === metric && count >= t.threshold);
  return matches.length ? matches[matches.length - 1].key : null;
}
