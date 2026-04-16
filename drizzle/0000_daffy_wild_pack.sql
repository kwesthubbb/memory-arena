CREATE TYPE "public"."player_outcome" AS ENUM('active', 'eliminated', 'winner', 'left');--> statement-breakpoint
CREATE TYPE "public"."room_phase" AS ENUM('lobby', 'memorizing', 'answering', 'round_result', 'completed');--> statement-breakpoint
CREATE TYPE "public"."signal_kind" AS ENUM('sun', 'wave', 'mint', 'berry');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'student',
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"host_user_id" text NOT NULL,
	"phase" "room_phase" DEFAULT 'lobby' NOT NULL,
	"max_players" integer NOT NULL,
	"round_number" integer DEFAULT 0 NOT NULL,
	"sequence_length" integer DEFAULT 3 NOT NULL,
	"current_round_id" uuid,
	"winner_player_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "game_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"sequence" jsonb NOT NULL,
	"reveal_started_at" timestamp with time zone NOT NULL,
	"reveal_ends_at" timestamp with time zone NOT NULL,
	"answer_ends_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" text,
	"display_name" text NOT NULL,
	"is_bot" boolean DEFAULT false NOT NULL,
	"seat" integer NOT NULL,
	"outcome" "player_outcome" DEFAULT 'active' NOT NULL,
	"elimination_round" integer,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "round_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"submitted_sequence" jsonb NOT NULL,
	"is_correct" boolean NOT NULL,
	"matched_prefix" integer NOT NULL,
	"mismatch_index" integer,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_rounds" ADD CONSTRAINT "game_rounds_room_id_game_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."game_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_players" ADD CONSTRAINT "room_players_room_id_game_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."game_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_answers" ADD CONSTRAINT "round_answers_round_id_game_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."game_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_answers" ADD CONSTRAINT "round_answers_player_id_room_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."room_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "game_rooms_code_idx" ON "game_rooms" USING btree ("code");--> statement-breakpoint
CREATE INDEX "game_rounds_room_idx" ON "game_rounds" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_rounds_room_round_idx" ON "game_rounds" USING btree ("room_id","round_number");--> statement-breakpoint
CREATE INDEX "room_players_room_idx" ON "room_players" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "room_players_room_seat_idx" ON "room_players" USING btree ("room_id","seat");--> statement-breakpoint
CREATE UNIQUE INDEX "round_answers_round_player_idx" ON "round_answers" USING btree ("round_id","player_id");