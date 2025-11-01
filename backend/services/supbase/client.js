import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load .env
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

// Create a single supabase client for interacting with your database
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
export { supabaseAuth };
