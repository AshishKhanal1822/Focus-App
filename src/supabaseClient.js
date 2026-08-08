// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kzeapjlkcdhyozkwvpww.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6ZWFwamxrY2RoeW96a3d2cHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjA3ODksImV4cCI6MjA4MzMzNjc4OX0.mQMuVlM2fbjXr2T-JXK0rlfQpZRMg0Urr_v6xut5JGM';

export const supabase = createClient(supabaseUrl, supabaseKey);
