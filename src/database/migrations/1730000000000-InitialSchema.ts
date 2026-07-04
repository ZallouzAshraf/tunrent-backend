import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public`);
    await queryRunner.query(`CREATE TYPE public.agencies_governorate_enum AS ENUM (
    'tunis',
    'ariana',
    'ben_arous',
    'manouba',
    'nabeul',
    'zaghouan',
    'bizerte',
    'beja',
    'jendouba',
    'kef',
    'siliana',
    'sousse',
    'monastir',
    'mahdia',
    'sfax',
    'kairouan',
    'kasserine',
    'sidi_bouzid',
    'gabes',
    'mednine',
    'tataouine',
    'gafsa',
    'tozeur',
    'kebili'
)`);
    await queryRunner.query(`CREATE TYPE public.agencies_plan_enum AS ENUM (
    'free',
    'starter',
    'pro',
    'enterprise'
)`);
    await queryRunner.query(`CREATE TYPE public.agencies_status_enum AS ENUM (
    'pending_validation',
    'active',
    'suspended',
    'rejected'
)`);
    await queryRunner.query(`CREATE TYPE public.agency_users_role_enum AS ENUM (
    'owner',
    'manager',
    'agent'
)`);
    await queryRunner.query(`CREATE TYPE public.agency_users_status_enum AS ENUM (
    'active',
    'invited',
    'suspended'
)`);
    await queryRunner.query(`CREATE TYPE public.bookings_cancelled_by_enum AS ENUM (
    'client',
    'agency',
    'system'
)`);
    await queryRunner.query(`CREATE TYPE public.bookings_source_enum AS ENUM (
    'marketplace',
    'direct',
    'phone'
)`);
    await queryRunner.query(`CREATE TYPE public.bookings_status_enum AS ENUM (
    'pending',
    'confirmed',
    'rejected',
    'in_progress',
    'completed',
    'cancelled'
)`);
    await queryRunner.query(`CREATE TYPE public.cars_category_enum AS ENUM (
    'economy',
    'compact',
    'suv',
    'sedan',
    'luxury',
    'van',
    'pickup',
    'convertible'
)`);
    await queryRunner.query(`CREATE TYPE public.cars_fuel_type_enum AS ENUM (
    'gasoline',
    'diesel',
    'electric',
    'hybrid'
)`);
    await queryRunner.query(`CREATE TYPE public.cars_status_enum AS ENUM (
    'available',
    'rented',
    'maintenance',
    'inactive'
)`);
    await queryRunner.query(`CREATE TYPE public.cars_transmission_enum AS ENUM (
    'manual',
    'automatic'
)`);
    await queryRunner.query(`CREATE TYPE public.notifications_type_enum AS ENUM (
    'booking_new',
    'booking_confirmed',
    'booking_rejected',
    'booking_cancelled',
    'booking_completed',
    'payment_received',
    'review_new',
    'invitation',
    'system'
)`);
    await queryRunner.query(`CREATE TYPE public.payments_method_enum AS ENUM (
    'cash',
    'card',
    'flouci',
    'd17',
    'clictopay',
    'bank_transfer'
)`);
    await queryRunner.query(`CREATE TYPE public.payments_status_enum AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
)`);
    await queryRunner.query(`CREATE TYPE public.payments_type_enum AS ENUM (
    'deposit',
    'full_payment',
    'partial',
    'refund'
)`);
    await queryRunner.query(`CREATE TYPE public.plan_change_requests_current_plan_enum AS ENUM (
    'free',
    'starter',
    'pro',
    'enterprise'
)`);
    await queryRunner.query(`CREATE TYPE public.plan_change_requests_requested_plan_enum AS ENUM (
    'free',
    'starter',
    'pro',
    'enterprise'
)`);
    await queryRunner.query(`CREATE TYPE public.plan_change_requests_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
)`);
    await queryRunner.query(`CREATE TYPE public.users_role_global_enum AS ENUM (
    'super_admin',
    'client'
)`);
    await queryRunner.query(`CREATE TABLE public.agencies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    logo_url text,
    cover_url text,
    email character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    phone_whatsapp character varying(20),
    address text NOT NULL,
    city character varying(100) NOT NULL,
    governorate public.agencies_governorate_enum NOT NULL,
    postal_code character varying(10),
    latitude numeric(10,8),
    longitude numeric(11,8),
    patente_number character varying(50),
    patente_url text,
    rib character varying(20),
    status public.agencies_status_enum DEFAULT 'pending_validation'::public.agencies_status_enum NOT NULL,
    rejection_reason text,
    plan public.agencies_plan_enum DEFAULT 'free'::public.agencies_plan_enum NOT NULL,
    plan_expires_at timestamp without time zone,
    max_cars integer DEFAULT 5 NOT NULL,
    max_users integer DEFAULT 2 NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    avg_rating numeric(3,2) DEFAULT '0'::numeric NOT NULL,
    total_reviews integer DEFAULT 0 NOT NULL,
    total_bookings integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
)`);
    await queryRunner.query(`CREATE TABLE public.agency_users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    agency_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.agency_users_role_enum NOT NULL,
    status public.agency_users_status_enum DEFAULT 'active'::public.agency_users_status_enum NOT NULL,
    invitation_token character varying(255),
    invitation_expires_at timestamp without time zone,
    invited_by_user_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
)`);
    await queryRunner.query(`CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    agency_id uuid,
    user_id uuid,
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
)`);
    await queryRunner.query(`CREATE TABLE public.bookings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    booking_reference character varying(20) NOT NULL,
    agency_id uuid NOT NULL,
    car_id uuid NOT NULL,
    client_user_id uuid,
    client_first_name character varying(100) NOT NULL,
    client_last_name character varying(100) NOT NULL,
    client_email character varying(255) NOT NULL,
    client_phone character varying(20) NOT NULL,
    client_cin character varying(8),
    client_driving_license character varying(50),
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_days smallint NOT NULL,
    pickup_location text NOT NULL,
    dropoff_location text NOT NULL,
    price_per_day numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    deposit_amount numeric(10,2),
    status public.bookings_status_enum DEFAULT 'pending'::public.bookings_status_enum NOT NULL,
    rejection_reason text,
    cancellation_reason text,
    cancelled_by public.bookings_cancelled_by_enum,
    client_notes text,
    agency_notes text,
    confirmed_by uuid,
    confirmed_at timestamp without time zone,
    pickup_at timestamp without time zone,
    dropoff_at timestamp without time zone,
    source public.bookings_source_enum DEFAULT 'marketplace'::public.bookings_source_enum NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CHK_fc9da30d1b68710d67a7d23654" CHECK ((end_date > start_date))
)`);
    await queryRunner.query(`CREATE TABLE public.car_availability_blocks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    agency_id uuid NOT NULL,
    car_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason character varying(255),
    notes text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL
)`);
    await queryRunner.query(`CREATE TABLE public.cars (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    agency_id uuid NOT NULL,
    brand character varying(100) NOT NULL,
    model character varying(100) NOT NULL,
    year smallint NOT NULL,
    color character varying(50),
    registration_number character varying(20) NOT NULL,
    vin character varying(17),
    category public.cars_category_enum NOT NULL,
    transmission public.cars_transmission_enum NOT NULL,
    fuel_type public.cars_fuel_type_enum NOT NULL,
    seats smallint NOT NULL,
    doors smallint DEFAULT '4'::smallint NOT NULL,
    has_ac boolean DEFAULT true NOT NULL,
    has_gps boolean DEFAULT false NOT NULL,
    has_bluetooth boolean DEFAULT false NOT NULL,
    has_usb boolean DEFAULT false NOT NULL,
    has_child_seat boolean DEFAULT false NOT NULL,
    has_insurance boolean DEFAULT true NOT NULL,
    mileage integer,
    price_per_day numeric(10,2) NOT NULL,
    price_per_week numeric(10,2),
    deposit_amount numeric(10,2),
    min_rental_days smallint DEFAULT '1'::smallint NOT NULL,
    min_driver_age smallint DEFAULT '21'::smallint NOT NULL,
    status public.cars_status_enum DEFAULT 'available'::public.cars_status_enum NOT NULL,
    photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    thumbnail_url text,
    description text,
    pickup_locations jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
)`);
    await queryRunner.query(`CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    agency_id uuid,
    user_id uuid NOT NULL,
    type public.notifications_type_enum NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    data jsonb,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
)`);
    await queryRunner.query(`CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    agency_id uuid NOT NULL,
    booking_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'TND'::character varying NOT NULL,
    method public.payments_method_enum NOT NULL,
    type public.payments_type_enum NOT NULL,
    status public.payments_status_enum DEFAULT 'pending'::public.payments_status_enum NOT NULL,
    transaction_id character varying(255),
    gateway_response jsonb,
    paid_at timestamp without time zone,
    notes text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL
)`);
    await queryRunner.query(`CREATE TABLE public.plan_change_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    agency_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    current_plan public.plan_change_requests_current_plan_enum NOT NULL,
    requested_plan public.plan_change_requests_requested_plan_enum NOT NULL,
    monthly_price numeric(10,2) NOT NULL,
    status public.plan_change_requests_status_enum DEFAULT 'pending'::public.plan_change_requests_status_enum NOT NULL,
    note text,
    admin_note text,
    processed_by uuid,
    processed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
)`);
    await queryRunner.query(`CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    agency_id uuid,
    device_info character varying(255),
    ip_address character varying(45),
    expires_at timestamp without time zone NOT NULL,
    revoked_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
)`);
    await queryRunner.query(`CREATE TABLE public.reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    agency_id uuid NOT NULL,
    car_id uuid,
    booking_id uuid NOT NULL,
    client_user_id uuid,
    client_name character varying(200) NOT NULL,
    rating_overall smallint NOT NULL,
    rating_car_condition smallint,
    rating_service smallint,
    rating_value smallint,
    comment text,
    agency_reply text,
    agency_replied_at timestamp without time zone,
    is_visible boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CHK_3ade80d7a36ce0f8cc83521ee1" CHECK (((rating_overall >= 1) AND (rating_overall <= 5)))
)`);
    await queryRunner.query(`CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    phone character varying(20),
    cin character varying(8),
    driving_license_number character varying(50),
    driving_license_expiry date,
    driving_license_photo_url text,
    cin_photo_url text,
    avatar_url text,
    role_global public.users_role_global_enum DEFAULT 'client'::public.users_role_global_enum NOT NULL,
    is_email_verified boolean DEFAULT false NOT NULL,
    email_verification_token character varying(255),
    email_verification_expires_at timestamp without time zone,
    password_reset_token character varying(255),
    password_reset_expires_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
)`);
    await queryRunner.query(`ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY (id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY (id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY (id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT "PK_8ab1f1f53f56c8255b0d7e68b28" PRIMARY KEY (id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.plan_change_requests
    ADD CONSTRAINT "PK_8aca0e76d06e7339b0203bf0616" PRIMARY KEY (id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.agency_users
    ADD CONSTRAINT "PK_ae72ca39f0a748bf74eef99df42" PRIMARY KEY (id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY (id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.car_availability_blocks
    ADD CONSTRAINT "PK_cc177851013f28420cf07704dc8" PRIMARY KEY (id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.cars
    ADD CONSTRAINT "PK_fc218aa84e79b477d55322271b6" PRIMARY KEY (id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.cars
    ADD CONSTRAINT "UQ_1a56deecb54b4ed4917445f49e9" UNIQUE (vin)`);
    await queryRunner.query(`ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "UQ_5ba137683172608bf22d69538a0" UNIQUE (booking_reference)`);
    await queryRunner.query(`ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT "UQ_77c10291e442a33f0060b9cad0d" UNIQUE (slug)`);
    await queryRunner.query(`ALTER TABLE ONLY public.cars
    ADD CONSTRAINT "UQ_7f878da8cd0988629f607612775" UNIQUE (agency_id, registration_number)`);
    await queryRunner.query(`ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email)`);
    await queryRunner.query(`ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_9b4e53aca6ef6552d5ce3d51a35" UNIQUE (cin)`);
    await queryRunner.query(`ALTER TABLE ONLY public.agency_users
    ADD CONSTRAINT "UQ_9fb3d136daf58d5e9357d335ada" UNIQUE (agency_id, user_id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "UQ_bbd6ac6e3e6a8f8c6e0e8692d63" UNIQUE (booking_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_067897144d8795fbbdc4d9f775" ON public.cars USING btree (status, fuel_type, transmission)`);
    await queryRunner.query(`CREATE INDEX "IDX_0d6206c7f8486a304c30b8960e" ON public.reviews USING btree (car_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_1a0e5be4669a0cf22f6e762d0f" ON public.bookings USING btree (agency_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_1dfc890dafd0b25472778798b5" ON public.bookings USING btree (client_user_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_2642bd6066a7aceaa963d3a4ac" ON public.reviews USING btree (client_user_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_2fca02bf097b947093a0e76e1d" ON public.agency_users USING btree (user_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_32955173410a7f8ced27363b4e" ON public.agencies USING btree (status)`);
    await queryRunner.query(`CREATE INDEX "IDX_32b41cdb985a296213e9a928b5" ON public.payments USING btree (status)`);
    await queryRunner.query(`CREATE INDEX "IDX_3a435d8bed684aa89e973cb6c7" ON public.cars USING btree (price_per_day)`);
    await queryRunner.query(`CREATE INDEX "IDX_3c324ca49dabde7ffc0ef64675" ON public.payments USING btree (transaction_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON public.refresh_tokens USING btree (user_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_3fcac681ff086712fe17706661" ON public.cars USING btree (agency_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_48b267d894e32a25ebde4b207a" ON public.bookings USING btree (status)`);
    await queryRunner.query(`CREATE INDEX "IDX_5ba137683172608bf22d69538a" ON public.bookings USING btree (booking_reference)`);
    await queryRunner.query(`CREATE INDEX "IDX_5c9b97e241a0ac47eeb797134e" ON public.agencies USING btree (governorate)`);
    await queryRunner.query(`CREATE INDEX "IDX_5e8bc32787782492ed9729e4f3" ON public.reviews USING btree (agency_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_6d9f037cc1c2c283deae220fbb" ON public.cars USING btree (status, category, price_per_day)`);
    await queryRunner.query(`CREATE INDEX "IDX_77c10291e442a33f0060b9cad0" ON public.agencies USING btree (slug)`);
    await queryRunner.query(`CREATE INDEX "IDX_859da38515c2e17fe14efcb8da" ON public.car_availability_blocks USING btree (car_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_85c204d8e47769ac183b32bf9c" ON public.audit_logs USING btree (entity_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_8710315b8150f72b07f94cbba3" ON public.car_availability_blocks USING btree (car_id, start_date, end_date)`);
    await queryRunner.query(`CREATE INDEX "IDX_8a5f0e4dcbee6c97d0de4961df" ON public.car_availability_blocks USING btree (start_date)`);
    await queryRunner.query(`CREATE INDEX "IDX_8a970b1dbbf3fb79b9d0152b68" ON public.bookings USING btree (end_date)`);
    await queryRunner.query(`CREATE INDEX "IDX_9471770ad72369098f9c416dca" ON public.cars USING btree (status, seats)`);
    await queryRunner.query(`CREATE INDEX "IDX_94882ffd99d7af17a0fad28012" ON public.payments USING btree (agency_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON public.users USING btree (email)`);
    await queryRunner.query(`CREATE INDEX "IDX_9a8a82462cab47c73d25f49261" ON public.notifications USING btree (user_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_9b4e53aca6ef6552d5ce3d51a3" ON public.users USING btree (cin)`);
    await queryRunner.query(`CREATE INDEX "IDX_a000cca60bcf04454e72769949" ON public.users USING btree (phone)`);
    await queryRunner.query(`CREATE INDEX "IDX_a08737e69160cbbdaa22db7063" ON public.cars USING btree (category)`);
    await queryRunner.query(`CREATE INDEX "IDX_a37a9ce499a633119bb1c71010" ON public.bookings USING btree (car_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_a7838d2ba25be1342091b6695f" ON public.refresh_tokens USING btree (token_hash)`);
    await queryRunner.query(`CREATE INDEX "IDX_ab0731d07b55a853a9718d3e85" ON public.notifications USING btree (agency_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_ba9f281cd0a8939c368d5bfb48" ON public.agencies USING btree (plan)`);
    await queryRunner.query(`CREATE INDEX "IDX_bd2726fd31b35443f2245b93ba" ON public.audit_logs USING btree (user_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_c37e395099e76a7d15ecb73d3e" ON public.agencies USING btree (status, governorate, is_featured)`);
    await queryRunner.query(`CREATE INDEX "IDX_cb6f5f5aedd4d832705d6ebbdd" ON public.agency_users USING btree (invitation_token)`);
    await queryRunner.query(`CREATE INDEX "IDX_dcee9978df46cc64caf06c8ce3" ON public.bookings USING btree (start_date)`);
    await queryRunner.query(`CREATE INDEX "IDX_e30b25401a83fc6012688b5956" ON public.bookings USING btree (car_id, status, start_date, end_date)`);
    await queryRunner.query(`CREATE INDEX "IDX_e5ebbf54024fd39bdbece302e5" ON public.plan_change_requests USING btree (status)`);
    await queryRunner.query(`CREATE INDEX "IDX_e86edf76dc2424f123b9023a2b" ON public.payments USING btree (booking_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_ea9ba3dfb39050f831ee3be40d" ON public.audit_logs USING btree (entity_type)`);
    await queryRunner.query(`CREATE INDEX "IDX_ecb426a8bab6770bd864ace695" ON public.cars USING btree (status)`);
    await queryRunner.query(`CREATE INDEX "IDX_f12148ce379462ebbb4d06cc13" ON public.notifications USING btree (is_read)`);
    await queryRunner.query(`CREATE INDEX "IDX_f3f83e73fc68ba59ddec53c358" ON public.cars USING btree (fuel_type)`);
    await queryRunner.query(`CREATE INDEX "IDX_f7175c1e45870aa7da33cbb057" ON public.car_availability_blocks USING btree (end_date)`);
    await queryRunner.query(`CREATE INDEX "IDX_fc5f9367dcbe93c0b2e7afd5cc" ON public.audit_logs USING btree (agency_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_fe4065b8f5b53fb980b88dec45" ON public.agency_users USING btree (agency_id)`);
    await queryRunner.query(`CREATE INDEX "IDX_ff49e70bbaf0ba512bebb03cc7" ON public.plan_change_requests USING btree (agency_id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "FK_0d6206c7f8486a304c30b8960ed" FOREIGN KEY (car_id) REFERENCES public.cars(id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.car_availability_blocks
    ADD CONSTRAINT "FK_0f7cda5ab0a50edd3820b7151fb" FOREIGN KEY (created_by) REFERENCES public.users(id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_1a0e5be4669a0cf22f6e762d0f7" FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_1dfc890dafd0b25472778798b5c" FOREIGN KEY (client_user_id) REFERENCES public.users(id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "FK_2642bd6066a7aceaa963d3a4ac7" FOREIGN KEY (client_user_id) REFERENCES public.users(id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_2b505576ec68c4d47782a51a832" FOREIGN KEY (created_by) REFERENCES public.users(id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.plan_change_requests
    ADD CONSTRAINT "FK_2e9f2b23cc06f19004c24fba9c8" FOREIGN KEY (processed_by) REFERENCES public.users(id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.agency_users
    ADD CONSTRAINT "FK_2fca02bf097b947093a0e76e1d5" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY (user_id) REFERENCES public.users(id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.cars
    ADD CONSTRAINT "FK_3fcac681ff086712fe177066610" FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "FK_5e8bc32787782492ed9729e4f35" FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE ONLY public.car_availability_blocks
    ADD CONSTRAINT "FK_62fefb7e5f4ac64e545afd043b2" FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE ONLY public.plan_change_requests
    ADD CONSTRAINT "FK_721bb60c36dc9b9229bd5cc0f11" FOREIGN KEY (requested_by) REFERENCES public.users(id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_841d786908fe85c96a15a4a4ba3" FOREIGN KEY (confirmed_by) REFERENCES public.users(id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.car_availability_blocks
    ADD CONSTRAINT "FK_859da38515c2e17fe14efcb8da0" FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_94882ffd99d7af17a0fad280129" FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_a37a9ce499a633119bb1c71010b" FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_ab0731d07b55a853a9718d3e85d" FOREIGN KEY (agency_id) REFERENCES public.agencies(id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.cars
    ADD CONSTRAINT "FK_b771d939d46a2fcaae3eecff606" FOREIGN KEY (created_by) REFERENCES public.users(id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "FK_bbd6ac6e3e6a8f8c6e0e8692d63" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY (user_id) REFERENCES public.users(id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.agency_users
    ADD CONSTRAINT "FK_d06d353093643b70d455dbaab45" FOREIGN KEY (invited_by_user_id) REFERENCES public.users(id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "FK_fc5f9367dcbe93c0b2e7afd5ccf" FOREIGN KEY (agency_id) REFERENCES public.agencies(id)`);
    await queryRunner.query(`ALTER TABLE ONLY public.agency_users
    ADD CONSTRAINT "FK_fe4065b8f5b53fb980b88dec452" FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE ONLY public.plan_change_requests
    ADD CONSTRAINT "FK_ff49e70bbaf0ba512bebb03cc7f" FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "plan_change_requests" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "car_availability_blocks" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cars" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agency_users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agencies" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "plan_change_requests_status_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "plan_change_requests_requested_plan_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "plan_change_requests_current_plan_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payments_type_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payments_status_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payments_method_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notifications_type_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cars_transmission_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cars_status_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cars_fuel_type_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cars_category_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "bookings_status_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "bookings_source_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "bookings_cancelled_by_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "agency_users_status_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "agency_users_role_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "agencies_status_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "agencies_plan_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "agencies_governorate_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_global_enum" CASCADE`);
  }
}
