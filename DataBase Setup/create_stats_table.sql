-- ====================================================================
-- SECTION 1: CREATE TABLE AND ENABLE RLS
-- Run this block first if your editor splits statements naively.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.user_daily_stats (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    screen_time_seconds INTEGER DEFAULT 0 NOT NULL,
    reading_time_seconds INTEGER DEFAULT 0 NOT NULL,
    focus_time_seconds INTEGER DEFAULT 0 NOT NULL,
    writing_time_seconds INTEGER DEFAULT 0 NOT NULL,
    tasks_completed INTEGER DEFAULT 0 NOT NULL,
    words_written INTEGER DEFAULT 0 NOT NULL,
    focus_sessions_completed INTEGER DEFAULT 0 NOT NULL,
    PRIMARY KEY (user_id, date)
);

ALTER TABLE public.user_daily_stats ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- SECTION 2: POLICIES AND PERMISSIONS
-- Run this block second.
-- ====================================================================

DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_daily_stats;
CREATE POLICY "Users can view their own stats"
    ON public.user_daily_stats FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_daily_stats;
CREATE POLICY "Users can insert their own stats"
    ON public.user_daily_stats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_daily_stats;
CREATE POLICY "Users can update their own stats"
    ON public.user_daily_stats FOR UPDATE
    USING (auth.uid() = user_id);

GRANT ALL ON public.user_daily_stats TO authenticated;
GRANT ALL ON public.user_daily_stats TO anon;
GRANT ALL ON public.user_daily_stats TO service_role;

-- ====================================================================
-- SECTION 3: RPC FUNCTION TO INCREMENT STATS
-- IMPORTANT: Run this entire block as a SINGLE query execution.
-- Semicolons inside the $$ block are part of the function body.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.increment_user_stats(
    p_user_id UUID,
    p_date DATE,
    p_screen_time INTEGER DEFAULT 0,
    p_reading_time INTEGER DEFAULT 0,
    p_focus_time INTEGER DEFAULT 0,
    p_writing_time INTEGER DEFAULT 0,
    p_tasks_completed INTEGER DEFAULT 0,
    p_words_written INTEGER DEFAULT 0,
    p_focus_sessions INTEGER DEFAULT 0
) RETURNS void AS $$
BEGIN
    INSERT INTO public.user_daily_stats (
        user_id, date, screen_time_seconds, reading_time_seconds, 
        focus_time_seconds, writing_time_seconds, tasks_completed, 
        words_written, focus_sessions_completed
    )
    VALUES (
        p_user_id, p_date, p_screen_time, p_reading_time, 
        p_focus_time, p_writing_time, p_tasks_completed, 
        p_words_written, p_focus_sessions
    )
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        screen_time_seconds = public.user_daily_stats.screen_time_seconds + EXCLUDED.screen_time_seconds,
        reading_time_seconds = public.user_daily_stats.reading_time_seconds + EXCLUDED.reading_time_seconds,
        focus_time_seconds = public.user_daily_stats.focus_time_seconds + EXCLUDED.focus_time_seconds,
        writing_time_seconds = public.user_daily_stats.writing_time_seconds + EXCLUDED.writing_time_seconds,
        tasks_completed = public.user_daily_stats.tasks_completed + EXCLUDED.tasks_completed,
        words_written = public.user_daily_stats.words_written + EXCLUDED.words_written,
        focus_sessions_completed = public.user_daily_stats.focus_sessions_completed + EXCLUDED.focus_sessions_completed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
