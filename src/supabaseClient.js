// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kzeapjlkcdhyozkwvpww.supabase.co";
const supabaseKey = "sb_publishable_40K3Mw_awc7aZGpJ8BrdCQ_jsFgsX44"; // anon key

export const supabase = createClient(supabaseUrl, supabaseKey);
