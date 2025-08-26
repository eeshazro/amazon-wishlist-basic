--
-- PostgreSQL database dump
--

\restrict 45iLIbha96fNPcsFfRDu9AvH6FgBolVqHjdzAmHP8bdl9cbj7nREpigbFOv2gPp

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
-- Name: collab; Type: SCHEMA; Schema: -; Owner: postgres_username
--

CREATE SCHEMA collab;


ALTER SCHEMA collab OWNER TO postgres_username;

--
-- Name: user; Type: SCHEMA; Schema: -; Owner: postgres_username
--

CREATE SCHEMA "user";


ALTER SCHEMA "user" OWNER TO postgres_username;

--
-- Name: wishlist; Type: SCHEMA; Schema: -; Owner: postgres_username
--

CREATE SCHEMA wishlist;


ALTER SCHEMA wishlist OWNER TO postgres_username;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: wishlist_access; Type: TABLE; Schema: collab; Owner: postgres_username
--

CREATE TABLE collab.wishlist_access (
    wishlist_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(20) DEFAULT 'view_only'::character varying NOT NULL,
    invited_by integer,
    invited_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    display_name character varying(255),
    CONSTRAINT wishlist_access_role_check CHECK (((role)::text = ANY ((ARRAY['view_only'::character varying, 'edit'::character varying, 'owner'::character varying])::text[])))
);


ALTER TABLE collab.wishlist_access OWNER TO postgres_username;

--
-- Name: wishlist_invite; Type: TABLE; Schema: collab; Owner: postgres_username
--

CREATE TABLE collab.wishlist_invite (
    id integer NOT NULL,
    wishlist_id integer NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    access_type character varying(20) DEFAULT 'view_only'::character varying NOT NULL
);


ALTER TABLE collab.wishlist_invite OWNER TO postgres_username;

--
-- Name: COLUMN wishlist_invite.access_type; Type: COMMENT; Schema: collab; Owner: postgres_username
--

COMMENT ON COLUMN collab.wishlist_invite.access_type IS 'Type of access granted by this invite (view_only, edit)';


--
-- Name: wishlist_invite_id_seq; Type: SEQUENCE; Schema: collab; Owner: postgres_username
--

CREATE SEQUENCE collab.wishlist_invite_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE collab.wishlist_invite_id_seq OWNER TO postgres_username;

--
-- Name: wishlist_invite_id_seq; Type: SEQUENCE OWNED BY; Schema: collab; Owner: postgres_username
--

ALTER SEQUENCE collab.wishlist_invite_id_seq OWNED BY collab.wishlist_invite.id;


--
-- Name: wishlist_item_comment; Type: TABLE; Schema: collab; Owner: postgres_username
--

CREATE TABLE collab.wishlist_item_comment (
    id integer NOT NULL,
    wishlist_item_id integer NOT NULL,
    user_id integer NOT NULL,
    comment_text text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE collab.wishlist_item_comment OWNER TO postgres_username;

--
-- Name: TABLE wishlist_item_comment; Type: COMMENT; Schema: collab; Owner: postgres_username
--

COMMENT ON TABLE collab.wishlist_item_comment IS 'Stores comments on wishlist items for collaboration features';


--
-- Name: wishlist_item_comment_id_seq; Type: SEQUENCE; Schema: collab; Owner: postgres_username
--

CREATE SEQUENCE collab.wishlist_item_comment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE collab.wishlist_item_comment_id_seq OWNER TO postgres_username;

--
-- Name: wishlist_item_comment_id_seq; Type: SEQUENCE OWNED BY; Schema: collab; Owner: postgres_username
--

ALTER SEQUENCE collab.wishlist_item_comment_id_seq OWNED BY collab.wishlist_item_comment.id;


--
-- Name: user; Type: TABLE; Schema: user; Owner: postgres_username
--

CREATE TABLE "user"."user" (
    id integer NOT NULL,
    public_name character varying(255) NOT NULL,
    icon_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "user"."user" OWNER TO postgres_username;

--
-- Name: user_id_seq; Type: SEQUENCE; Schema: user; Owner: postgres_username
--

CREATE SEQUENCE "user".user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "user".user_id_seq OWNER TO postgres_username;

--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: user; Owner: postgres_username
--

ALTER SEQUENCE "user".user_id_seq OWNED BY "user"."user".id;


--
-- Name: wishlist; Type: TABLE; Schema: wishlist; Owner: postgres_username
--

CREATE TABLE wishlist.wishlist (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    owner_id integer NOT NULL,
    privacy character varying(20) DEFAULT 'private'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE wishlist.wishlist OWNER TO postgres_username;

--
-- Name: wishlist_id_seq; Type: SEQUENCE; Schema: wishlist; Owner: postgres_username
--

CREATE SEQUENCE wishlist.wishlist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE wishlist.wishlist_id_seq OWNER TO postgres_username;

--
-- Name: wishlist_id_seq; Type: SEQUENCE OWNED BY; Schema: wishlist; Owner: postgres_username
--

ALTER SEQUENCE wishlist.wishlist_id_seq OWNED BY wishlist.wishlist.id;


--
-- Name: wishlist_item; Type: TABLE; Schema: wishlist; Owner: postgres_username
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


ALTER TABLE wishlist.wishlist_item OWNER TO postgres_username;

--
-- Name: wishlist_item_id_seq; Type: SEQUENCE; Schema: wishlist; Owner: postgres_username
--

CREATE SEQUENCE wishlist.wishlist_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE wishlist.wishlist_item_id_seq OWNER TO postgres_username;

--
-- Name: wishlist_item_id_seq; Type: SEQUENCE OWNED BY; Schema: wishlist; Owner: postgres_username
--

ALTER SEQUENCE wishlist.wishlist_item_id_seq OWNED BY wishlist.wishlist_item.id;


--
-- Name: wishlist_invite id; Type: DEFAULT; Schema: collab; Owner: postgres_username
--

ALTER TABLE ONLY collab.wishlist_invite ALTER COLUMN id SET DEFAULT nextval('collab.wishlist_invite_id_seq'::regclass);


--
-- Name: wishlist_item_comment id; Type: DEFAULT; Schema: collab; Owner: postgres_username
--

ALTER TABLE ONLY collab.wishlist_item_comment ALTER COLUMN id SET DEFAULT nextval('collab.wishlist_item_comment_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: user; Owner: postgres_username
--

ALTER TABLE ONLY "user"."user" ALTER COLUMN id SET DEFAULT nextval('"user".user_id_seq'::regclass);


--
-- Name: wishlist id; Type: DEFAULT; Schema: wishlist; Owner: postgres_username
--

ALTER TABLE ONLY wishlist.wishlist ALTER COLUMN id SET DEFAULT nextval('wishlist.wishlist_id_seq'::regclass);


--
-- Name: wishlist_item id; Type: DEFAULT; Schema: wishlist; Owner: postgres_username
--

ALTER TABLE ONLY wishlist.wishlist_item ALTER COLUMN id SET DEFAULT nextval('wishlist.wishlist_item_id_seq'::regclass);


--
-- Data for Name: wishlist_access; Type: TABLE DATA; Schema: collab; Owner: postgres_username
--

COPY collab.wishlist_access (wishlist_id, user_id, role, invited_by, invited_at, display_name) FROM stdin;
2	2	edit	1	2025-08-26 10:31:13.90061	THE ROCK.
1	4	view_only	1	2025-08-26 10:31:13.90061	SPONGE BOB.
\.


--
-- Data for Name: wishlist_invite; Type: TABLE DATA; Schema: collab; Owner: postgres_username
--

COPY collab.wishlist_invite (id, wishlist_id, token, expires_at, created_at, access_type) FROM stdin;
1	2	invite-token-demo	2025-08-29 10:31:13.926784	2025-08-26 10:31:13.926784	edit
2	1	invite-token-view	2025-08-28 10:31:13.926784	2025-08-26 10:31:13.926784	view_only
\.


--
-- Data for Name: wishlist_item_comment; Type: TABLE DATA; Schema: collab; Owner: postgres_username
--

COPY collab.wishlist_item_comment (id, wishlist_item_id, user_id, comment_text, created_at) FROM stdin;
1	1	3	Love these! Perfect for my commute	2025-08-26 10:31:13.90337
2	1	2	Great choice! I have the same ones	2025-08-26 10:31:13.90337
3	2	3	This would be perfect for reading	2025-08-26 10:31:13.90337
4	3	2	Low profile is definitely the way to go	2025-08-26 10:31:13.90337
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: user; Owner: postgres_username
--

COPY "user"."user" (id, public_name, icon_url, created_at) FROM stdin;
1	alice	https://i.pravatar.cc/100?img=1	2025-08-26 10:31:10.83641
2	bob	https://i.pravatar.cc/100?img=2	2025-08-26 10:31:10.83641
3	carol	https://i.pravatar.cc/100?img=3	2025-08-26 10:31:10.83641
4	dave	https://i.pravatar.cc/100?img=4	2025-08-26 10:31:10.83641
\.


--
-- Data for Name: wishlist; Type: TABLE DATA; Schema: wishlist; Owner: postgres_username
--

COPY wishlist.wishlist (id, name, owner_id, privacy, created_at) FROM stdin;
1	Alice's Birthday	1	Shared	2025-08-26 10:31:13.876385
2	Office Setup	1	Shared	2025-08-26 10:31:13.876385
\.


--
-- Data for Name: wishlist_item; Type: TABLE DATA; Schema: wishlist; Owner: postgres_username
--

COPY wishlist.wishlist_item (id, product_id, wishlist_id, title, priority, comments, added_by, created_at) FROM stdin;
1	1	1	Noise-cancelling Headphones	1	These look great	1	2025-08-26 10:31:13.897373
2	2	1	Kindle Paperwhite	2	\N	1	2025-08-26 10:31:13.897373
3	3	2	Mechanical Keyboard	1	Low profile?	1	2025-08-26 10:31:13.897373
4	4	2	4K Monitor	2	\N	1	2025-08-26 10:31:13.897373
5	5	2	USB-C Dock	3	\N	1	2025-08-26 10:31:13.897373
\.


--
-- Name: wishlist_invite_id_seq; Type: SEQUENCE SET; Schema: collab; Owner: postgres_username
--

SELECT pg_catalog.setval('collab.wishlist_invite_id_seq', 2, true);


--
-- Name: wishlist_item_comment_id_seq; Type: SEQUENCE SET; Schema: collab; Owner: postgres_username
--

SELECT pg_catalog.setval('collab.wishlist_item_comment_id_seq', 4, true);


--
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: user; Owner: postgres_username
--

SELECT pg_catalog.setval('"user".user_id_seq', 4, true);


--
-- Name: wishlist_id_seq; Type: SEQUENCE SET; Schema: wishlist; Owner: postgres_username
--

SELECT pg_catalog.setval('wishlist.wishlist_id_seq', 3, true);


--
-- Name: wishlist_item_id_seq; Type: SEQUENCE SET; Schema: wishlist; Owner: postgres_username
--

SELECT pg_catalog.setval('wishlist.wishlist_item_id_seq', 5, true);


--
-- Name: wishlist_access wishlist_access_pkey; Type: CONSTRAINT; Schema: collab; Owner: postgres_username
--

ALTER TABLE ONLY collab.wishlist_access
    ADD CONSTRAINT wishlist_access_pkey PRIMARY KEY (wishlist_id, user_id);


--
-- Name: wishlist_invite wishlist_invite_pkey; Type: CONSTRAINT; Schema: collab; Owner: postgres_username
--

ALTER TABLE ONLY collab.wishlist_invite
    ADD CONSTRAINT wishlist_invite_pkey PRIMARY KEY (id);


--
-- Name: wishlist_invite wishlist_invite_token_key; Type: CONSTRAINT; Schema: collab; Owner: postgres_username
--

ALTER TABLE ONLY collab.wishlist_invite
    ADD CONSTRAINT wishlist_invite_token_key UNIQUE (token);


--
-- Name: wishlist_item_comment wishlist_item_comment_pkey; Type: CONSTRAINT; Schema: collab; Owner: postgres_username
--

ALTER TABLE ONLY collab.wishlist_item_comment
    ADD CONSTRAINT wishlist_item_comment_pkey PRIMARY KEY (id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: user; Owner: postgres_username
--

ALTER TABLE ONLY "user"."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: wishlist_item wishlist_item_pkey; Type: CONSTRAINT; Schema: wishlist; Owner: postgres_username
--

ALTER TABLE ONLY wishlist.wishlist_item
    ADD CONSTRAINT wishlist_item_pkey PRIMARY KEY (id);


--
-- Name: wishlist_item wishlist_item_wishlist_id_product_id_key; Type: CONSTRAINT; Schema: wishlist; Owner: postgres_username
--

ALTER TABLE ONLY wishlist.wishlist_item
    ADD CONSTRAINT wishlist_item_wishlist_id_product_id_key UNIQUE (wishlist_id, product_id);


--
-- Name: wishlist wishlist_pkey; Type: CONSTRAINT; Schema: wishlist; Owner: postgres_username
--

ALTER TABLE ONLY wishlist.wishlist
    ADD CONSTRAINT wishlist_pkey PRIMARY KEY (id);


--
-- Name: idx_wishlist_access_user; Type: INDEX; Schema: collab; Owner: postgres_username
--

CREATE INDEX idx_wishlist_access_user ON collab.wishlist_access USING btree (user_id);


--
-- Name: idx_wishlist_access_wishlist; Type: INDEX; Schema: collab; Owner: postgres_username
--

CREATE INDEX idx_wishlist_access_wishlist ON collab.wishlist_access USING btree (wishlist_id);


--
-- Name: idx_wishlist_invite_token; Type: INDEX; Schema: collab; Owner: postgres_username
--

CREATE INDEX idx_wishlist_invite_token ON collab.wishlist_invite USING btree (token);


--
-- Name: idx_wishlist_invite_wishlist; Type: INDEX; Schema: collab; Owner: postgres_username
--

CREATE INDEX idx_wishlist_invite_wishlist ON collab.wishlist_invite USING btree (wishlist_id);


--
-- Name: idx_wishlist_item_comment_created; Type: INDEX; Schema: collab; Owner: postgres_username
--

CREATE INDEX idx_wishlist_item_comment_created ON collab.wishlist_item_comment USING btree (created_at);


--
-- Name: idx_wishlist_item_comment_item; Type: INDEX; Schema: collab; Owner: postgres_username
--

CREATE INDEX idx_wishlist_item_comment_item ON collab.wishlist_item_comment USING btree (wishlist_item_id);


--
-- Name: idx_wishlist_item_comment_user; Type: INDEX; Schema: collab; Owner: postgres_username
--

CREATE INDEX idx_wishlist_item_comment_user ON collab.wishlist_item_comment USING btree (user_id);


--
-- Name: idx_wishlist_item_added_by; Type: INDEX; Schema: wishlist; Owner: postgres_username
--

CREATE INDEX idx_wishlist_item_added_by ON wishlist.wishlist_item USING btree (added_by);


--
-- Name: idx_wishlist_item_wishlist; Type: INDEX; Schema: wishlist; Owner: postgres_username
--

CREATE INDEX idx_wishlist_item_wishlist ON wishlist.wishlist_item USING btree (wishlist_id);


--
-- Name: idx_wishlist_owner; Type: INDEX; Schema: wishlist; Owner: postgres_username
--

CREATE INDEX idx_wishlist_owner ON wishlist.wishlist USING btree (owner_id);


--
-- Name: wishlist_access wishlist_access_invited_by_fkey; Type: FK CONSTRAINT; Schema: collab; Owner: postgres_username
--

ALTER TABLE ONLY collab.wishlist_access
    ADD CONSTRAINT wishlist_access_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES "user"."user"(id) ON DELETE SET NULL;


--
-- Name: wishlist_access wishlist_access_user_id_fkey; Type: FK CONSTRAINT; Schema: collab; Owner: postgres_username
--

ALTER TABLE ONLY collab.wishlist_access
    ADD CONSTRAINT wishlist_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"."user"(id) ON DELETE CASCADE;


--
-- Name: wishlist_access wishlist_access_wishlist_id_fkey; Type: FK CONSTRAINT; Schema: collab; Owner: postgres_username
--

ALTER TABLE ONLY collab.wishlist_access
    ADD CONSTRAINT wishlist_access_wishlist_id_fkey FOREIGN KEY (wishlist_id) REFERENCES wishlist.wishlist(id) ON DELETE CASCADE;


--
-- Name: wishlist_invite wishlist_invite_wishlist_id_fkey; Type: FK CONSTRAINT; Schema: collab; Owner: postgres_username
--

ALTER TABLE ONLY collab.wishlist_invite
    ADD CONSTRAINT wishlist_invite_wishlist_id_fkey FOREIGN KEY (wishlist_id) REFERENCES wishlist.wishlist(id) ON DELETE CASCADE;


--
-- Name: wishlist_item_comment wishlist_item_comment_user_id_fkey; Type: FK CONSTRAINT; Schema: collab; Owner: postgres_username
--

ALTER TABLE ONLY collab.wishlist_item_comment
    ADD CONSTRAINT wishlist_item_comment_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"."user"(id) ON DELETE CASCADE;


--
-- Name: wishlist_item_comment wishlist_item_comment_wishlist_item_id_fkey; Type: FK CONSTRAINT; Schema: collab; Owner: postgres_username
--

ALTER TABLE ONLY collab.wishlist_item_comment
    ADD CONSTRAINT wishlist_item_comment_wishlist_item_id_fkey FOREIGN KEY (wishlist_item_id) REFERENCES wishlist.wishlist_item(id) ON DELETE CASCADE;


--
-- Name: wishlist_item wishlist_item_added_by_fkey; Type: FK CONSTRAINT; Schema: wishlist; Owner: postgres_username
--

ALTER TABLE ONLY wishlist.wishlist_item
    ADD CONSTRAINT wishlist_item_added_by_fkey FOREIGN KEY (added_by) REFERENCES "user"."user"(id) ON DELETE CASCADE;


--
-- Name: wishlist_item wishlist_item_wishlist_id_fkey; Type: FK CONSTRAINT; Schema: wishlist; Owner: postgres_username
--

ALTER TABLE ONLY wishlist.wishlist_item
    ADD CONSTRAINT wishlist_item_wishlist_id_fkey FOREIGN KEY (wishlist_id) REFERENCES wishlist.wishlist(id) ON DELETE CASCADE;


--
-- Name: wishlist wishlist_owner_id_fkey; Type: FK CONSTRAINT; Schema: wishlist; Owner: postgres_username
--

ALTER TABLE ONLY wishlist.wishlist
    ADD CONSTRAINT wishlist_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES "user"."user"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 45iLIbha96fNPcsFfRDu9AvH6FgBolVqHjdzAmHP8bdl9cbj7nREpigbFOv2gPp

