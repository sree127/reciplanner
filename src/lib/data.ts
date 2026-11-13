import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Member = { userId: string; name: string; email: string; role: "owner" | "member" };

export function displayName(name: string | null | undefined, email: string): string {
  return name?.trim() || email.split("@")[0];
}

export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  return { supabase, userId: claims.sub, email: String(claims.email ?? "").toLowerCase() };
});

export const getMyHousehold = cache(async () => {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("household_members")
    .select("role, households(id, name)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.households) return null;
  return { id: data.households.id, name: data.households.name, role: data.role };
});

export async function getMembers(householdId: string): Promise<Member[]> {
  const { supabase } = await requireUser();
  const { data: members, error } = await supabase
    .from("household_members")
    .select("user_id, role, joined_at")
    .eq("household_id", householdId)
    .order("joined_at");
  if (error) throw error;

  const ids = members.map((m) => m.user_id);
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, email")
    .in("id", ids);
  if (profileError) throw profileError;

  const byId = new Map(profiles.map((p) => [p.id, p]));
  return members.map((m) => {
    const p = byId.get(m.user_id);
    const email = p?.email ?? "";
    return { userId: m.user_id, role: m.role, email, name: displayName(p?.name, email) };
  });
}

export async function getMyProfileName(): Promise<string> {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase.from("profiles").select("name").eq("id", userId).maybeSingle();
  return data?.name ?? "";
}
