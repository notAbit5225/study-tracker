// ─────────────────────────────────────────────────────────────────────────────
// Public config. EVERYTHING in this file is safe to commit to a public repo.
//
//  • SUPABASE_URL      – just the address of your project.
//  • SUPABASE_ANON_KEY – the "anon" / "publishable" key. It is meant to be public:
//                        it only lets the browser *talk* to Supabase. What it can
//                        actually read or write is decided by Row Level Security
//                        policies in the database (see supabase/migrations).
//
// Your email is deliberately NOT stored here: this repo is public, so it would
// be readable by anyone. You type it once per device on the login screen.
//
// NEVER put the "service_role" / "secret" key here. That one skips all security.
// ─────────────────────────────────────────────────────────────────────────────

export const SUPABASE_URL = 'https://wwuqhdkwshzeacohayyb.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_5S3PxwPVbsM3O2UvSWZAaQ_ponUeuPE';

// Day boundaries are always calculated in this timezone, whatever the device says.
export const TIMEZONE = 'Asia/Tbilisi';
