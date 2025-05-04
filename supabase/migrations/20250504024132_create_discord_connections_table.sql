CREATE TABLE IF NOT EXISTS "public"."discord_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "connection_id" "text" NOT NULL,
    "connection_type" "text" NOT NULL,
    "connection_name" "text" NOT NULL,
    "connection_verified" boolean DEFAULT false,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."discord_connections" OWNER TO "postgres";

ALTER TABLE ONLY "public"."discord_connections"
    ADD CONSTRAINT "discord_connections_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."discord_connections"
    ADD CONSTRAINT "discord_connections_user_id_connection_id_connection_type_key" UNIQUE ("user_id", "connection_id", "connection_type");

ALTER TABLE ONLY "public"."discord_connections"
    ADD CONSTRAINT "discord_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE; 