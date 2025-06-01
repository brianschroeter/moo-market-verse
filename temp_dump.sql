

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin';
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_announcements"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If a record is deleted, shift positions of items with higher positions
  IF (TG_OP = 'DELETE') THEN
    UPDATE announcements
    SET position = position - 1
    WHERE position > OLD.position;
    RETURN OLD;
  -- For inserts with a specific position, shift other items
  ELSIF (TG_OP = 'INSERT' AND NEW.position IS NOT NULL) THEN
    UPDATE announcements
    SET position = position + 1
    WHERE position >= NEW.position AND id != NEW.id;
    RETURN NEW;
  -- For updates with position change, adjust other items
  ELSIF (TG_OP = 'UPDATE' AND OLD.position != NEW.position) THEN
    -- If moving to a higher position (down in the list)
    IF (NEW.position > OLD.position) THEN
      UPDATE announcements
      SET position = position - 1
      WHERE position > OLD.position AND position <= NEW.position AND id != NEW.id;
    -- If moving to a lower position (up in the list)
    ELSIF (NEW.position < OLD.position) THEN
      UPDATE announcements
      SET position = position + 1
      WHERE position >= NEW.position AND position < OLD.position AND id != NEW.id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."reorder_announcements"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_settings_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_settings_timestamp"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."announcement_settings" (
    "id" integer NOT NULL,
    "cycle_interval_seconds" integer DEFAULT 10 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "announcement_settings_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."announcement_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."announcement_settings" IS 'Stores configuration settings for the announcement display.';



COMMENT ON COLUMN "public"."announcement_settings"."id" IS 'Primary key for the settings row (e.g., always 1).';



COMMENT ON COLUMN "public"."announcement_settings"."cycle_interval_seconds" IS 'Time in seconds each announcement is displayed.';



CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "folder_id" "uuid" NOT NULL,
    "bynder_asset_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "bynder_asset_url" "text",
    "bynder_thumbnail_url" "text",
    "bynder_file_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "added_by_id" "uuid" DEFAULT "auth"."uid"() NOT NULL
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pardot_auth_verifiers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code_verifier" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pardot_auth_verifiers" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."expired_auth_verifiers" AS
 SELECT "pardot_auth_verifiers"."id"
   FROM "public"."pardot_auth_verifiers"
  WHERE ("pardot_auth_verifiers"."expires_at" < "now"());


ALTER TABLE "public"."expired_auth_verifiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "parent_folder_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "owner_id" "uuid" DEFAULT "auth"."uid"() NOT NULL
);


ALTER TABLE "public"."folders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."folders"."parent_folder_id" IS 'NULL indicates a root folder';



CREATE TABLE IF NOT EXISTS "public"."pardot_auth_tokens" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "instance_url" "text" NOT NULL,
    "expires_at" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pardot_auth_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pardot_email_campaigns" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pardot_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "subject" "text",
    "created_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "sender_email" "text",
    "list_id" "text",
    "campaign_id" "text",
    "metadata" "jsonb",
    "last_synced_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pardot_email_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pardot_email_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "date" timestamp with time zone NOT NULL,
    "sent_count" integer DEFAULT 0,
    "delivered_count" integer DEFAULT 0,
    "open_count" integer DEFAULT 0,
    "unique_open_count" integer DEFAULT 0,
    "click_count" integer DEFAULT 0,
    "unique_click_count" integer DEFAULT 0,
    "bounce_count" integer DEFAULT 0,
    "opt_out_count" integer DEFAULT 0,
    "spam_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pardot_email_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pardot_sync_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sync_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" NOT NULL,
    "records_processed" integer DEFAULT 0,
    "error_message" "text",
    "duration_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pardot_sync_logs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."announcement_settings"
    ADD CONSTRAINT "announcement_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_bynder_asset_id_key" UNIQUE ("bynder_asset_id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pardot_auth_tokens"
    ADD CONSTRAINT "pardot_auth_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pardot_auth_verifiers"
    ADD CONSTRAINT "pardot_auth_verifiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pardot_email_campaigns"
    ADD CONSTRAINT "pardot_email_campaigns_pardot_id_key" UNIQUE ("pardot_id");



ALTER TABLE ONLY "public"."pardot_email_campaigns"
    ADD CONSTRAINT "pardot_email_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pardot_email_metrics"
    ADD CONSTRAINT "pardot_email_metrics_campaign_id_date_key" UNIQUE ("campaign_id", "date");



ALTER TABLE ONLY "public"."pardot_email_metrics"
    ADD CONSTRAINT "pardot_email_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pardot_sync_logs"
    ADD CONSTRAINT "pardot_sync_logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_documents_bynder_asset_id" ON "public"."documents" USING "btree" ("bynder_asset_id");



CREATE INDEX "idx_documents_folder_id" ON "public"."documents" USING "btree" ("folder_id");



CREATE INDEX "idx_folders_parent_folder_id" ON "public"."folders" USING "btree" ("parent_folder_id");



CREATE INDEX "idx_pardot_auth_verifiers_expires_at" ON "public"."pardot_auth_verifiers" USING "btree" ("expires_at");



CREATE INDEX "idx_pardot_email_metrics_campaign_id" ON "public"."pardot_email_metrics" USING "btree" ("campaign_id");



CREATE INDEX "idx_pardot_email_metrics_date" ON "public"."pardot_email_metrics" USING "btree" ("date");



CREATE INDEX "idx_pardot_sync_logs_date" ON "public"."pardot_sync_logs" USING "btree" ("sync_date");



CREATE OR REPLACE TRIGGER "handle_announcement_reordering" AFTER INSERT OR DELETE OR UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."reorder_announcements"();



CREATE OR REPLACE TRIGGER "handle_settings_update" BEFORE UPDATE ON "public"."announcement_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_settings_timestamp"();



CREATE OR REPLACE TRIGGER "set_documents_timestamp" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_folders_timestamp" BEFORE UPDATE ON "public"."folders" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pardot_email_metrics"
    ADD CONSTRAINT "pardot_email_metrics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."pardot_email_campaigns"("id") ON DELETE CASCADE;



CREATE POLICY "Allow admins to delete documents" ON "public"."documents" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Allow admins to delete folders" ON "public"."folders" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Allow admins to insert documents" ON "public"."documents" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Allow admins to insert folders" ON "public"."folders" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Allow admins to update documents" ON "public"."documents" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Allow admins to update folders" ON "public"."folders" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Allow authenticated users to read documents" ON "public"."documents" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to read folders" ON "public"."folders" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow public read access" ON "public"."announcement_settings" FOR SELECT USING (true);



CREATE POLICY "Service Role Only" ON "public"."pardot_auth_verifiers" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."announcement_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pardot_auth_verifiers" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reorder_announcements"() TO "anon";
GRANT ALL ON FUNCTION "public"."reorder_announcements"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_announcements"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_settings_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_settings_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_settings_timestamp"() TO "service_role";



GRANT ALL ON TABLE "public"."announcement_settings" TO "anon";
GRANT ALL ON TABLE "public"."announcement_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."announcement_settings" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."pardot_auth_verifiers" TO "anon";
GRANT ALL ON TABLE "public"."pardot_auth_verifiers" TO "authenticated";
GRANT ALL ON TABLE "public"."pardot_auth_verifiers" TO "service_role";



GRANT ALL ON TABLE "public"."expired_auth_verifiers" TO "anon";
GRANT ALL ON TABLE "public"."expired_auth_verifiers" TO "authenticated";
GRANT ALL ON TABLE "public"."expired_auth_verifiers" TO "service_role";



GRANT ALL ON TABLE "public"."folders" TO "anon";
GRANT ALL ON TABLE "public"."folders" TO "authenticated";
GRANT ALL ON TABLE "public"."folders" TO "service_role";



GRANT ALL ON TABLE "public"."pardot_auth_tokens" TO "anon";
GRANT ALL ON TABLE "public"."pardot_auth_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."pardot_auth_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."pardot_email_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."pardot_email_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."pardot_email_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."pardot_email_metrics" TO "anon";
GRANT ALL ON TABLE "public"."pardot_email_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."pardot_email_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."pardot_sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."pardot_sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."pardot_sync_logs" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






RESET ALL;
