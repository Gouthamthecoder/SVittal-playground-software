--
-- PostgreSQL database dump
--


-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

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

ALTER TABLE IF EXISTS ONLY public.user_shops DROP CONSTRAINT IF EXISTS user_shops_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.user_shops DROP CONSTRAINT IF EXISTS user_shops_shop_id_shops_id_fk;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_unique;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.user_shops DROP CONSTRAINT IF EXISTS user_shops_user_id_shop_id_pk;
ALTER TABLE IF EXISTS ONLY public.shops DROP CONSTRAINT IF EXISTS shops_pkey;
ALTER TABLE IF EXISTS ONLY public.shops DROP CONSTRAINT IF EXISTS shops_name_unique;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS public.shops ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sessions ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_shops;
DROP SEQUENCE IF EXISTS public.shops_id_seq;
DROP TABLE IF EXISTS public.shops;
DROP SEQUENCE IF EXISTS public.sessions_id_seq;
DROP TABLE IF EXISTS public.sessions;
DROP SCHEMA IF EXISTS public;
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    kid_name text NOT NULL,
    child_socks text NOT NULL,
    parent_socks text,
    parents_count real DEFAULT 1 NOT NULL,
    hours_of_play real NOT NULL,
    custom_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    in_time timestamp without time zone DEFAULT now() NOT NULL,
    out_time timestamp without time zone,
    date text NOT NULL,
    shop_id integer
);


--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: shops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shops (
    id integer NOT NULL,
    name text NOT NULL,
    code character varying(20)
);


--
-- Name: shops_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shops_id_seq OWNED BY public.shops.id;


--
-- Name: user_shops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_shops (
    user_id character varying NOT NULL,
    shop_id integer NOT NULL,
    role character varying(20) DEFAULT 'staff'::character varying NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role character varying(20) DEFAULT 'staff'::character varying NOT NULL
);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: shops id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops ALTER COLUMN id SET DEFAULT nextval('public.shops_id_seq'::regclass);


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (id, kid_name, child_socks, parent_socks, parents_count, hours_of_play, custom_fields, in_time, out_time, date, shop_id) FROM stdin;
1	Test Kid	C-001	P-001	1	1	[]	2026-03-31 05:26:22.863	2026-03-31 05:26:27.989	2026-03-31	\N
3	Tara	xs	\N	1	1	[]	2026-03-31 06:16:20.73	\N	2026-03-31	\N
4	Tara	xs	xl	2	1	[{"id": "0.4438071062323591", "label": "ph", "value": "9677200526"}]	2026-03-31 17:37:48.017	\N	2026-03-31	\N
2	Tara	xs	xl	1	1	[]	2026-03-31 06:15:03.454	2026-03-31 17:38:07.192	2026-03-31	\N
5	Tara	xs	\N	1	1	[]	2026-03-31 17:38:12.397	\N	2026-03-31	\N
7	Tara	xs	\N	1	1	[]	2026-04-05 05:43:50.321	\N	2026-04-05	\N
8	Tara	xs	\N	0	1	[]	2026-04-05 05:50:07.792	\N	2026-04-05	\N
9	Tara	xs	xl | l	2	1	[]	2026-04-05 05:59:36.028	\N	2026-04-05	\N
6	Tara	xs	xl	1	1	[]	2026-04-05 05:43:16.474	2026-04-05 06:03:09.706	2026-04-05	\N
10	Tara g	xs	\N	1	1	[]	2026-04-07 15:45:21.136	2026-04-07 16:03:42.363	2026-04-07	\N
11	Tara	xs	\N	1	1	[]	2026-04-07 16:20:13.078	\N	2026-04-07	2
12	vikas	xs	\N	1	1	[]	2026-04-07 16:20:21.293	\N	2026-04-07	2
13	vibav	xs	\N	1	1	[]	2026-04-07 16:21:07.306	\N	2026-04-07	3
14	niral	xs	\N	1	1	[]	2026-04-07 16:21:16.373	\N	2026-04-07	3
15	vishnu	xs	\N	1	1	[]	2026-04-07 16:21:24.088	\N	2026-04-07	3
\.


--
-- Data for Name: shops; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shops (id, name, code) FROM stdin;
2	MLM Pallavaram	MLM-PL
3	MLM MMNagar	MLM-MM
\.


--
-- Data for Name: user_shops; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_shops (user_id, shop_id, role) FROM stdin;
60c98799-38c0-472a-9203-bebcb5911549	2	staff
a423d004-f698-4e6d-8a47-5c5454504816	2	admin
150f318e-6322-43d4-91f8-875730af0062	3	staff
a423d004-f698-4e6d-8a47-5c5454504816	3	admin
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password, role) FROM stdin;
a423d004-f698-4e6d-8a47-5c5454504816	admin	015eb98a53022e719a134cf20c164aa9:8e787f654e7bdcbd78daaf27b8b0a163d5e418f26b582b1a74653a506d2e5296e1424810d3747e1c44d026528f6d8b16ba0b9e4895dab0b13fa4f88be8fd3b38	admin
60c98799-38c0-472a-9203-bebcb5911549	ajith	ca4b3a25c432de11181c33f0e7233bad:6e4a054091f43162f1d96919d8f4acad68017267fe71d50d4e8248fe3ef186426284622c3ff5a0d428d39fd24de9702cc94b4956c35bd299092764ce34982081	staff
150f318e-6322-43d4-91f8-875730af0062	gayatri	e291cdf3567252ea0187de23a15ec9db:844d836bc2c07d47b5d426fac62cfc095ca4f2dd6e5d0a1b748e1ff9837e89f99d8a5df34b90ce6d4642fff40b4f5d72b2eeaee171100c687ac7aa5c5bf1fd99	staff
\.


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sessions_id_seq', 15, true);


--
-- Name: shops_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shops_id_seq', 3, true);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: shops shops_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_name_unique UNIQUE (name);


--
-- Name: shops shops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_pkey PRIMARY KEY (id);


--
-- Name: user_shops user_shops_user_id_shop_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_shops
    ADD CONSTRAINT user_shops_user_id_shop_id_pk PRIMARY KEY (user_id, shop_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: user_shops user_shops_shop_id_shops_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_shops
    ADD CONSTRAINT user_shops_shop_id_shops_id_fk FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: user_shops user_shops_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_shops
    ADD CONSTRAINT user_shops_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict nlSI2ZsCM2FF9uG0hCScOrAwmcFnD33JUH7BRulzxKlBumXKDlHJcWRqnUOIGWb

