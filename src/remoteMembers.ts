import { supabase } from "./supabaseClient";
import type { CleanMember, MemberFormErrors } from "./memberValidation";

/**
 * Creates a v4 UUID for a registration attempt. crypto.randomUUID() only exists
 * on secure (https/localhost) pages, so fall back to getRandomValues, which
 * also works over plain http (e.g. testing from a phone on the local network).
 */
export function newRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`;
}

export type RegisterResult =
  | { status: "created"; id: string }
  | { status: "duplicate" }
  | { status: "invalid"; field?: keyof MemberFormErrors; message: string };

interface RpcResponse {
  status?: string;
  id?: string;
  field?: string;
  message?: string;
}

/**
 * Registers a member through the register_cell_member() database function
 * (see supabase/migrations/20261018000000_cell_members.sql). The function
 * re-validates everything and flags duplicate phones. No PIN is needed: new
 * members register themselves from the shared "?register" link.
 * Throws on network/server failure so the caller can keep the form intact.
 */
export async function registerMemberRemote(
  requestId: string,
  member: CleanMember,
  allowDuplicate: boolean
): Promise<RegisterResult> {
  const { data, error } = await supabase.rpc("register_cell_member", {
    p_id: requestId,
    p_full_name: member.fullName,
    p_date_of_birth: member.dateOfBirth,
    p_phone: member.phone,
    p_email: member.email,
    p_hall_hostel: member.hallHostel,
    p_home_location: member.homeLocation,
    p_membership_status: member.membershipStatus,
    p_allow_duplicate: allowDuplicate,
  });

  if (error) throw error;

  const res = (data ?? {}) as RpcResponse;
  switch (res.status) {
    case "created":
      return { status: "created", id: res.id ?? requestId };
    case "duplicate":
      return { status: "duplicate" };
    case "invalid":
      return {
        status: "invalid",
        field: res.field as keyof MemberFormErrors | undefined,
        message: res.message ?? "The server rejected some of the details.",
      };
    default:
      throw new Error("Unexpected response from the server.");
  }
}
