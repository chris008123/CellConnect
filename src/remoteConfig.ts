import { supabase } from "./supabaseClient";

const TABLE = "app_config";
const ROW_ID = "default";

export async function fetchSettingsPin(): Promise<string> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("settings_pin")
    .eq("id", ROW_ID)
    .single();

  if (error) throw error;
  return data?.settings_pin ?? "";
}

export async function updateSettingsPinRemote(pin: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { id: ROW_ID, settings_pin: pin, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  if (error) throw error;
}
