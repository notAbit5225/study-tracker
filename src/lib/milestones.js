// Milestones: 10, 30, 50, 100, 150, 200 streak days.
//
// Flow, every time your streak history is loaded:
//   1. which milestones has your best streak reached?
//   2. save any new ones (the table's primary key makes repeats a no-op)
//   3. any saved-but-not-yet-celebrated ones → show the celebration, then
//      mark celebrated = true so no device shows it again
import { supabase } from './supabase.js';

export const MILESTONES = [
  { days: 10, name: 'First stamp', line: "Ten days. That's a habit starting." },
  { days: 30, name: 'The rosette', line: 'A whole month of showing up. Most people drop off way before this.' },
  { days: 50, name: 'Sealed', line: "Fifty. You're not forcing it anymore, you just do it." },
  { days: 100, name: 'The medal', line: "A hundred days. Seriously. Take a second with that one." },
  { days: 150, name: 'Laurels', line: "150. By exam day this stuff's going to feel familiar." },
  { days: 200, name: 'Constellation', line: 'Two hundred days. Whatever happens in that exam room, you built this.' },
];

export const milestoneInfo = (days) => MILESTONES.find((m) => m.days === days);

let checking = false;

// `celebrate(days)` is passed in by the UI and resolves when you close it.
export async function checkMilestones(history, celebrate) {
  if (checking) return; // Today and the timer can both call this at once
  checking = true;
  try {
    const reached = MILESTONES.filter((m) => history.best >= m.days).map((m) => ({ milestone: m.days }));
    if (reached.length) {
      const { error } = await supabase
        .from('milestones_earned')
        .upsert(reached, { onConflict: 'user_id,milestone', ignoreDuplicates: true });
      if (error) throw error;
    }

    const { data, error } = await supabase
      .from('milestones_earned')
      .select('milestone')
      .eq('celebrated', false)
      .order('milestone');
    if (error) throw error;

    // If you somehow earned two at once, they play one after the other.
    for (const row of data) {
      await celebrate(row.milestone);
      await supabase.from('milestones_earned').update({ celebrated: true }).eq('milestone', row.milestone);
    }
  } catch (err) {
    console.error(err);
  } finally {
    checking = false;
  }
}

export async function listEarned() {
  const { data, error } = await supabase.from('milestones_earned').select('milestone, earned_at').order('milestone');
  if (error) throw error;
  return data;
}
