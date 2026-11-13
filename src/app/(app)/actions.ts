"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/data";

export type FormState = { error?: string; inviteToken?: string; inviteEmail?: string };

async function saveName(formData: FormData) {
  const name = String(formData.get("your_name") ?? "").trim().slice(0, 80);
  if (!name) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("profiles").update({ name }).eq("id", userId);
}

export async function createHousehold(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("household_name") ?? "").trim();
  if (!name) return { error: "Give your household a name." };

  const { supabase } = await requireUser();
  await saveName(formData);
  const { error } = await supabase.rpc("create_household", { p_name: name });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/household?created=1");
}

export async function createInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { error: "Enter their email address." };

  const { supabase } = await requireUser();
  const { data: token, error } = await supabase.rpc("create_invite", { p_email: email });
  if (error) return { error: error.message };

  revalidatePath("/household");
  return { inviteToken: token, inviteEmail: email };
}

export async function revokeInvite(formData: FormData) {
  const id = String(formData.get("invite_id") ?? "");
  const { supabase } = await requireUser();
  await supabase.from("household_invites").delete().eq("id", id);
  revalidatePath("/household");
}

export async function acceptInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const leaveCurrent = formData.get("leave_current") === "yes";

  const { supabase } = await requireUser();
  await saveName(formData);
  const { error } = await supabase.rpc("accept_invite", { p_token: token, p_leave_current: leaveCurrent });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/?joined=1");
}

export async function updateName(_prev: FormState, formData: FormData): Promise<FormState> {
  await saveName(formData);
  revalidatePath("/", "layout");
  return {};
}

export async function leaveHousehold() {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("leave_household");
  if (error) throw error;
  revalidatePath("/", "layout");
  redirect("/");
}
