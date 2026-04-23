-- Idempotent bootstrap for Render/remote DBs.
-- Safe to run multiple times if the connection drops (ECONNRESET).

CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint

DO $$
BEGIN
  CREATE TYPE public.player_outcome AS ENUM ('active', 'eliminated', 'winner', 'left');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  CREATE TYPE public.room_phase AS ENUM ('lobby', 'memorizing', 'answering', 'round_result', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  CREATE TYPE public.signal_kind AS ENUM ('sun', 'wave', 'mint', 'berry');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.account (
  id text PRIMARY KEY NOT NULL,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamp,
  refresh_token_expires_at timestamp,
  scope text,
  password text,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.session (
  id text PRIMARY KEY NOT NULL,
  expires_at timestamp NOT NULL,
  token text NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp NOT NULL,
  ip_address text,
  user_agent text,
  user_id text NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public."user" (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  email_verified boolean DEFAULT false NOT NULL,
  image text,
  avatar_data bytea,
  avatar_type text,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL,
  role text DEFAULT 'student'
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.verification (
  id text PRIMARY KEY NOT NULL,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamp NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  title text NOT NULL,
  host_user_id text NOT NULL,
  phase public.room_phase DEFAULT 'lobby' NOT NULL,
  max_players integer NOT NULL,
  round_number integer DEFAULT 0 NOT NULL,
  sequence_length integer DEFAULT 3 NOT NULL,
  current_round_id uuid,
  winner_player_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  started_at timestamp with time zone,
  finished_at timestamp with time zone
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.game_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  room_id uuid NOT NULL,
  round_number integer NOT NULL,
  sequence jsonb NOT NULL,
  reveal_started_at timestamp with time zone NOT NULL,
  reveal_ends_at timestamp with time zone NOT NULL,
  answer_ends_at timestamp with time zone NOT NULL,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.room_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  room_id uuid NOT NULL,
  user_id text,
  display_name text NOT NULL,
  is_bot boolean DEFAULT false NOT NULL,
  seat integer NOT NULL,
  outcome public.player_outcome DEFAULT 'active' NOT NULL,
  elimination_round integer,
  joined_at timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.round_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  round_id uuid NOT NULL,
  player_id uuid NOT NULL,
  submitted_sequence jsonb NOT NULL,
  is_correct boolean NOT NULL,
  matched_prefix integer NOT NULL,
  mismatch_index integer,
  submitted_at timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Uniques
CREATE UNIQUE INDEX IF NOT EXISTS user_email_unique ON public."user" USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS session_token_unique ON public.session USING btree (token);
CREATE UNIQUE INDEX IF NOT EXISTS game_rooms_code_idx ON public.game_rooms USING btree (code);
CREATE UNIQUE INDEX IF NOT EXISTS game_rounds_room_round_idx ON public.game_rounds USING btree (room_id, round_number);
CREATE UNIQUE INDEX IF NOT EXISTS room_players_room_seat_idx ON public.room_players USING btree (room_id, seat);
CREATE UNIQUE INDEX IF NOT EXISTS round_answers_round_player_idx ON public.round_answers USING btree (round_id, player_id);
--> statement-breakpoint

-- Indexes
CREATE INDEX IF NOT EXISTS account_userId_idx ON public.account USING btree (user_id);
CREATE INDEX IF NOT EXISTS session_userId_idx ON public.session USING btree (user_id);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON public.verification USING btree (identifier);
CREATE INDEX IF NOT EXISTS game_rounds_room_idx ON public.game_rounds USING btree (room_id);
CREATE INDEX IF NOT EXISTS room_players_room_idx ON public.room_players USING btree (room_id);
--> statement-breakpoint

-- Foreign keys (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'account_user_id_user_id_fk') THEN
    ALTER TABLE public.account
      ADD CONSTRAINT account_user_id_user_id_fk
      FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_user_id_user_id_fk') THEN
    ALTER TABLE public.session
      ADD CONSTRAINT session_user_id_user_id_fk
      FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_rounds_room_id_game_rooms_id_fk') THEN
    ALTER TABLE public.game_rounds
      ADD CONSTRAINT game_rounds_room_id_game_rooms_id_fk
      FOREIGN KEY (room_id) REFERENCES public.game_rooms(id) ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_players_room_id_game_rooms_id_fk') THEN
    ALTER TABLE public.room_players
      ADD CONSTRAINT room_players_room_id_game_rooms_id_fk
      FOREIGN KEY (room_id) REFERENCES public.game_rooms(id) ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'round_answers_round_id_game_rounds_id_fk') THEN
    ALTER TABLE public.round_answers
      ADD CONSTRAINT round_answers_round_id_game_rounds_id_fk
      FOREIGN KEY (round_id) REFERENCES public.game_rounds(id) ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'round_answers_player_id_room_players_id_fk') THEN
    ALTER TABLE public.round_answers
      ADD CONSTRAINT round_answers_player_id_room_players_id_fk
      FOREIGN KEY (player_id) REFERENCES public.room_players(id) ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint
