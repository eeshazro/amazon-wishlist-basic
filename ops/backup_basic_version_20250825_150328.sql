--
-- PostgreSQL database dump
--

\restrict O61F1ZYIOidRBsedybrB0QFj2BdSEmTmn5qe2RuVBtacTGwwLOIXWyNMTgiBgIU

-- Dumped from database version 15.14 (Debian 15.14-1.pgdg13+1)
-- Dumped by pg_dump version 15.14 (Debian 15.14-1.pgdg13+1)

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

--
-- Name: collab; Type: SCHEMA; Schema: -; Owner: wishlist_user
--

CREATE SCHEMA collab;


ALTER SCHEMA collab OWNER TO wishlist_user;

--
-- Name: user; Type: SCHEMA; Schema: -; Owner: wishlist_user
--

CREATE SCHEMA "user";


ALTER SCHEMA "user" OWNER TO wishlist_user;

--
-- Name: wishlist; Type: SCHEMA; Schema: -; Owner: wishlist_user
--

CREATE SCHEMA wishlist;


ALTER SCHEMA wishlist OWNER TO wishlist_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: wishlist_access; Type: TABLE; Schema: collab; Owner: wishlist_user
--

CREATE TABLE collab.wishlist_access (
    wishlist_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(20) DEFAULT 'view_only'::character varying NOT NULL,
    invited_by integer,
    invited_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    display_name character varying(255),
    CONSTRAINT wishlist_access_role_check CHECK (((role)::text = 'view_only'::text))
);


ALTER TABLE collab.wishlist_access OWNER TO wishlist_user;

--
-- Name: wishlist_invite; Type: TABLE; Schema: collab; Owner: wishlist_user
--

CREATE TABLE collab.wishlist_invite (
    id integer NOT NULL,
    wishlist_id integer NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE collab.wishlist_invite OWNER TO wishlist_user;

--
-- Name: wishlist_invite_id_seq; Type: SEQUENCE; Schema: collab; Owner: wishlist_user
--

CREATE SEQUENCE collab.wishlist_invite_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE collab.wishlist_invite_id_seq OWNER TO wishlist_user;

--
-- Name: wishlist_invite_id_seq; Type: SEQUENCE OWNED BY; Schema: collab; Owner: wishlist_user
--

ALTER SEQUENCE collab.wishlist_invite_id_seq OWNED BY collab.wishlist_invite.id;


--
-- Name: user; Type: TABLE; Schema: user; Owner: wishlist_user
--

CREATE TABLE "user"."user" (
    id integer NOT NULL,
    public_name character varying(255) NOT NULL,
    icon_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "user"."user" OWNER TO wishlist_user;

--
-- Name: user_id_seq; Type: SEQUENCE; Schema: user; Owner: wishlist_user
--

CREATE SEQUENCE "user".user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "user".user_id_seq OWNER TO wishlist_user;

--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: user; Owner: wishlist_user
--

ALTER SEQUENCE "user".user_id_seq OWNED BY "user"."user".id;


--
-- Name: wishlist; Type: TABLE; Schema: wishlist; Owner: wishlist_user
--

CREATE TABLE wishlist.wishlist (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    owner_id integer NOT NULL,
    privacy character varying(20) DEFAULT 'private'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE wishlist.wishlist OWNER TO wishlist_user;

--
-- Name: wishlist_id_seq; Type: SEQUENCE; Schema: wishlist; Owner: wishlist_user
--

CREATE SEQUENCE wishlist.wishlist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE wishlist.wishlist_id_seq OWNER TO wishlist_user;

--
-- Name: wishlist_id_seq; Type: SEQUENCE OWNED BY; Schema: wishlist; Owner: wishlist_user
--

ALTER SEQUENCE wishlist.wishlist_id_seq OWNED BY wishlist.wishlist.id;


--
-- Name: wishlist_item; Type: TABLE; Schema: wishlist; Owner: wishlist_user
--

CREATE TABLE wishlist.wishlist_item (
    id integer NOT NULL,
    product_id integer NOT NULL,
    wishlist_id integer NOT NULL,
    title character varying(500) NOT NULL,
    priority integer DEFAULT 1,
    comments text,
    added_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE wishlist.wishlist_item OWNER TO wishlist_user;

--
-- Name: wishlist_item_id_seq; Type: SEQUENCE; Schema: wishlist; Owner: wishlist_user
--

CREATE SEQUENCE wishlist.wishlist_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE wishlist.wishlist_item_id_seq OWNER TO wishlist_user;

--
-- Name: wishlist_item_id_seq; Type: SEQUENCE OWNED BY; Schema: wishlist; Owner: wishlist_user
--

ALTER SEQUENCE wishlist.wishlist_item_id_seq OWNED BY wishlist.wishlist_item.id;


--
-- Name: wishlist_invite id; Type: DEFAULT; Schema: collab; Owner: wishlist_user
--

ALTER TABLE ONLY collab.wishlist_invite ALTER COLUMN id SET DEFAULT nextval('collab.wishlist_invite_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: user; Owner: wishlist_user
--

ALTER TABLE ONLY "user"."user" ALTER COLUMN id SET DEFAULT nextval('"user".user_id_seq'::regclass);


--
-- Name: wishlist id; Type: DEFAULT; Schema: wishlist; Owner: wishlist_user
--

ALTER TABLE ONLY wishlist.wishlist ALTER COLUMN id SET DEFAULT nextval('wishlist.wishlist_id_seq'::regclass);


--
-- Name: wishlist_item id; Type: DEFAULT; Schema: wishlist; Owner: wishlist_user
--

ALTER TABLE ONLY wishlist.wishlist_item ALTER COLUMN id SET DEFAULT nextval('wishlist.wishlist_item_id_seq'::regclass);


--
-- Data for Name: wishlist_access; Type: TABLE DATA; Schema: collab; Owner: wishlist_user
--

COPY collab.wishlist_access (wishlist_id, user_id, role, invited_by, invited_at, display_name) FROM stdin;
1	2	view_only	1	2025-08-22 14:48:52.26342	Bob
\.


--
-- Data for Name: wishlist_invite; Type: TABLE DATA; Schema: collab; Owner: wishlist_user
--

COPY collab.wishlist_invite (id, wishlist_id, token, expires_at, created_at) FROM stdin;
1	1	EpYcMjcLd-kAzLji	2025-08-25 14:49:40.861	2025-08-22 14:49:40.862213
2	1	rffdp_QMtaxb0XIP	2025-08-27 20:11:11.438	2025-08-24 20:11:11.439378
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: user; Owner: wishlist_user
--

COPY "user"."user" (id, public_name, icon_url, created_at) FROM stdin;
1	alice	https://i.pravatar.cc/100?img=1	2025-08-22 14:48:52.261143
2	bob	https://i.pravatar.cc/100?img=2	2025-08-22 14:48:52.261143
3	carol	https://i.pravatar.cc/100?img=3	2025-08-22 14:48:52.261143
4	dave	https://i.pravatar.cc/100?img=4	2025-08-22 14:48:52.261143
\.


--
-- Data for Name: wishlist; Type: TABLE DATA; Schema: wishlist; Owner: wishlist_user
--

COPY wishlist.wishlist (id, name, owner_id, privacy, created_at) FROM stdin;
1	Alice's Birthday	1	shared	2025-08-22 14:48:52.262096
2	Christmas List	1	private	2025-08-22 14:48:52.262096
3	Home Office Setup	2	public	2025-08-22 14:48:52.262096
\.


--
-- Data for Name: wishlist_item; Type: TABLE DATA; Schema: wishlist; Owner: wishlist_user
--

COPY wishlist.wishlist_item (id, product_id, wishlist_id, title, priority, comments, added_by, created_at) FROM stdin;
1	1	1	Wireless Headphones	1	High quality sound	1	2025-08-22 14:48:52.262792
3	3	2	Coffee Maker	1	Programmable	1	2025-08-22 14:48:52.262792
4	4	3	Standing Desk	1	Adjustable height	2	2025-08-22 14:48:52.262792
5	5	3	Ergonomic Chair	2	Lumbar support	2	2025-08-22 14:48:52.262792
7	27	2	Desk Mat	1	\N	1	2025-08-24 20:11:38.337141
8	27	1	Desk Mat	1	\N	1	2025-08-24 20:30:36.984949
\.


--
-- Name: wishlist_invite_id_seq; Type: SEQUENCE SET; Schema: collab; Owner: wishlist_user
--

SELECT pg_catalog.setval('collab.wishlist_invite_id_seq', 2, true);


--
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: user; Owner: wishlist_user
--

SELECT pg_catalog.setval('"user".user_id_seq', 1, false);


--
-- Name: wishlist_id_seq; Type: SEQUENCE SET; Schema: wishlist; Owner: wishlist_user
--

SELECT pg_catalog.setval('wishlist.wishlist_id_seq', 3, true);


--
-- Name: wishlist_item_id_seq; Type: SEQUENCE SET; Schema: wishlist; Owner: wishlist_user
--

SELECT pg_catalog.setval('wishlist.wishlist_item_id_seq', 8, true);


--
-- Name: wishlist_access wishlist_access_pkey; Type: CONSTRAINT; Schema: collab; Owner: wishlist_user
--

ALTER TABLE ONLY collab.wishlist_access
    ADD CONSTRAINT wishlist_access_pkey PRIMARY KEY (wishlist_id, user_id);


--
-- Name: wishlist_invite wishlist_invite_pkey; Type: CONSTRAINT; Schema: collab; Owner: wishlist_user
--

ALTER TABLE ONLY collab.wishlist_invite
    ADD CONSTRAINT wishlist_invite_pkey PRIMARY KEY (id);


--
-- Name: wishlist_invite wishlist_invite_token_key; Type: CONSTRAINT; Schema: collab; Owner: wishlist_user
--

ALTER TABLE ONLY collab.wishlist_invite
    ADD CONSTRAINT wishlist_invite_token_key UNIQUE (token);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: user; Owner: wishlist_user
--

ALTER TABLE ONLY "user"."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: wishlist_item wishlist_item_pkey; Type: CONSTRAINT; Schema: wishlist; Owner: wishlist_user
--

ALTER TABLE ONLY wishlist.wishlist_item
    ADD CONSTRAINT wishlist_item_pkey PRIMARY KEY (id);


--
-- Name: wishlist_item wishlist_item_wishlist_id_product_id_key; Type: CONSTRAINT; Schema: wishlist; Owner: wishlist_user
--

ALTER TABLE ONLY wishlist.wishlist_item
    ADD CONSTRAINT wishlist_item_wishlist_id_product_id_key UNIQUE (wishlist_id, product_id);


--
-- Name: wishlist wishlist_pkey; Type: CONSTRAINT; Schema: wishlist; Owner: wishlist_user
--

ALTER TABLE ONLY wishlist.wishlist
    ADD CONSTRAINT wishlist_pkey PRIMARY KEY (id);


--
-- Name: idx_wishlist_access_user; Type: INDEX; Schema: collab; Owner: wishlist_user
--

CREATE INDEX idx_wishlist_access_user ON collab.wishlist_access USING btree (user_id);


--
-- Name: idx_wishlist_access_wishlist; Type: INDEX; Schema: collab; Owner: wishlist_user
--

CREATE INDEX idx_wishlist_access_wishlist ON collab.wishlist_access USING btree (wishlist_id);


--
-- Name: idx_wishlist_invite_token; Type: INDEX; Schema: collab; Owner: wishlist_user
--

CREATE INDEX idx_wishlist_invite_token ON collab.wishlist_invite USING btree (token);


--
-- Name: idx_wishlist_invite_wishlist; Type: INDEX; Schema: collab; Owner: wishlist_user
--

CREATE INDEX idx_wishlist_invite_wishlist ON collab.wishlist_invite USING btree (wishlist_id);


--
-- Name: idx_wishlist_item_added_by; Type: INDEX; Schema: wishlist; Owner: wishlist_user
--

CREATE INDEX idx_wishlist_item_added_by ON wishlist.wishlist_item USING btree (added_by);


--
-- Name: idx_wishlist_item_wishlist; Type: INDEX; Schema: wishlist; Owner: wishlist_user
--

CREATE INDEX idx_wishlist_item_wishlist ON wishlist.wishlist_item USING btree (wishlist_id);


--
-- Name: idx_wishlist_owner; Type: INDEX; Schema: wishlist; Owner: wishlist_user
--

CREATE INDEX idx_wishlist_owner ON wishlist.wishlist USING btree (owner_id);


--
-- Name: wishlist_access wishlist_access_invited_by_fkey; Type: FK CONSTRAINT; Schema: collab; Owner: wishlist_user
--

ALTER TABLE ONLY collab.wishlist_access
    ADD CONSTRAINT wishlist_access_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES "user"."user"(id) ON DELETE SET NULL;


--
-- Name: wishlist_access wishlist_access_user_id_fkey; Type: FK CONSTRAINT; Schema: collab; Owner: wishlist_user
--

ALTER TABLE ONLY collab.wishlist_access
    ADD CONSTRAINT wishlist_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"."user"(id) ON DELETE CASCADE;


--
-- Name: wishlist_access wishlist_access_wishlist_id_fkey; Type: FK CONSTRAINT; Schema: collab; Owner: wishlist_user
--

ALTER TABLE ONLY collab.wishlist_access
    ADD CONSTRAINT wishlist_access_wishlist_id_fkey FOREIGN KEY (wishlist_id) REFERENCES wishlist.wishlist(id) ON DELETE CASCADE;


--
-- Name: wishlist_invite wishlist_invite_wishlist_id_fkey; Type: FK CONSTRAINT; Schema: collab; Owner: wishlist_user
--

ALTER TABLE ONLY collab.wishlist_invite
    ADD CONSTRAINT wishlist_invite_wishlist_id_fkey FOREIGN KEY (wishlist_id) REFERENCES wishlist.wishlist(id) ON DELETE CASCADE;


--
-- Name: wishlist_item wishlist_item_added_by_fkey; Type: FK CONSTRAINT; Schema: wishlist; Owner: wishlist_user
--

ALTER TABLE ONLY wishlist.wishlist_item
    ADD CONSTRAINT wishlist_item_added_by_fkey FOREIGN KEY (added_by) REFERENCES "user"."user"(id) ON DELETE CASCADE;


--
-- Name: wishlist_item wishlist_item_wishlist_id_fkey; Type: FK CONSTRAINT; Schema: wishlist; Owner: wishlist_user
--

ALTER TABLE ONLY wishlist.wishlist_item
    ADD CONSTRAINT wishlist_item_wishlist_id_fkey FOREIGN KEY (wishlist_id) REFERENCES wishlist.wishlist(id) ON DELETE CASCADE;


--
-- Name: wishlist wishlist_owner_id_fkey; Type: FK CONSTRAINT; Schema: wishlist; Owner: wishlist_user
--

ALTER TABLE ONLY wishlist.wishlist
    ADD CONSTRAINT wishlist_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES "user"."user"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict O61F1ZYIOidRBsedybrB0QFj2BdSEmTmn5qe2RuVBtacTGwwLOIXWyNMTgiBgIU

