export const ROLES = ["SUPER_ADMIN", "MANAGER", "AGENT", "VIEWER"] as const;
export type RoleValue = (typeof ROLES)[number];

export const ROLE_LABELS: Record<RoleValue, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  AGENT: "Agent",
  VIEWER: "Viewer",
};

/** Settings, knowledge and campaigns. */
export const MANAGERS: RoleValue[] = ["SUPER_ADMIN", "MANAGER"];
/** Users and security. */
export const ADMINS: RoleValue[] = ["SUPER_ADMIN"];
/** Work contacts, calls, follow-ups and appointments. */
export const TEAM: RoleValue[] = ["SUPER_ADMIN", "MANAGER", "AGENT"];
