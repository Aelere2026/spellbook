--
-- PostgreSQL database dump
--

\restrict FN4JzuzEGObXtTWgI3nQH8C8KWFHY7HZU3OZ4Qws1SM7uvb67q7kf9dMZcYdni3

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Arbitrages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Arbitrages" (
    id integer NOT NULL,
    match_id integer NOT NULL,
    outcome_id_polymarket integer NOT NULL,
    outcome_id_kalshi integer NOT NULL,
    net_profit money NOT NULL,
    gross_profit money NOT NULL,
    total_fee money NOT NULL,
    estimated_slippage money NOT NULL,
    time_detection timestamp without time zone NOT NULL,
    time_execution timestamp without time zone NOT NULL
);


ALTER TABLE public."Arbitrages" OWNER TO postgres;

--
-- Name: COLUMN "Arbitrages".net_profit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Arbitrages".net_profit IS 'net gain ';


--
-- Name: COLUMN "Arbitrages".gross_profit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Arbitrages".gross_profit IS 'total before fee';


--
-- Name: COLUMN "Arbitrages".total_fee; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Arbitrages".total_fee IS 'loss from fees on both platforms';


--
-- Name: COLUMN "Arbitrages".estimated_slippage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Arbitrages".estimated_slippage IS 'whats lost between time detection and execution ';


--
-- Name: Arbitrages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Arbitrages_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Arbitrages_id_seq" OWNER TO postgres;

--
-- Name: Arbitrages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Arbitrages_id_seq" OWNED BY public."Arbitrages".id;


--
-- Name: Markets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Markets" (
    id integer NOT NULL,
    platform_id integer NOT NULL,
    api_id character varying NOT NULL,
    market_title text NOT NULL,
    event_date date NOT NULL,
    resolution_date date NOT NULL,
    status text NOT NULL,
    fee money NOT NULL,
    category text NOT NULL
);


ALTER TABLE public."Markets" OWNER TO postgres;

--
-- Name: Markets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Markets_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Markets_id_seq" OWNER TO postgres;

--
-- Name: Markets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Markets_id_seq" OWNED BY public."Markets".id;


--
-- Name: Matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Matches" (
    id integer NOT NULL,
    polymarket_id integer NOT NULL,
    kalshi_id integer NOT NULL,
    match_score double precision NOT NULL
);


ALTER TABLE public."Matches" OWNER TO postgres;

--
-- Name: Matches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Matches_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Matches_id_seq" OWNER TO postgres;

--
-- Name: Matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Matches_id_seq" OWNED BY public."Matches".id;


--
-- Name: Outcomes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Outcomes" (
    id integer NOT NULL,
    market_id integer NOT NULL,
    outcome text NOT NULL
);


ALTER TABLE public."Outcomes" OWNER TO postgres;

--
-- Name: Outcomes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Outcomes_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Outcomes_id_seq" OWNER TO postgres;

--
-- Name: Outcomes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Outcomes_id_seq" OWNED BY public."Outcomes".id;


--
-- Name: Platforms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Platforms" (
    id integer NOT NULL,
    name text NOT NULL,
    base_fee money NOT NULL
);


ALTER TABLE public."Platforms" OWNER TO postgres;

--
-- Name: COLUMN "Platforms".id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Platforms".id IS 'Primary Key';


--
-- Name: Platforms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Platforms_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Platforms_id_seq" OWNER TO postgres;

--
-- Name: Platforms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Platforms_id_seq" OWNED BY public."Platforms".id;


--
-- Name: Arbitrages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Arbitrages" ALTER COLUMN id SET DEFAULT nextval('public."Arbitrages_id_seq"'::regclass);


--
-- Name: Markets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Markets" ALTER COLUMN id SET DEFAULT nextval('public."Markets_id_seq"'::regclass);


--
-- Name: Matches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Matches" ALTER COLUMN id SET DEFAULT nextval('public."Matches_id_seq"'::regclass);


--
-- Name: Outcomes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Outcomes" ALTER COLUMN id SET DEFAULT nextval('public."Outcomes_id_seq"'::regclass);


--
-- Name: Platforms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Platforms" ALTER COLUMN id SET DEFAULT nextval('public."Platforms_id_seq"'::regclass);


--
-- Name: Arbitrages Arbitrages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Arbitrages"
    ADD CONSTRAINT "Arbitrages_pkey" PRIMARY KEY (id);


--
-- Name: Markets Markets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Markets"
    ADD CONSTRAINT "Markets_pkey" PRIMARY KEY (id);


--
-- Name: Matches Matches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Matches"
    ADD CONSTRAINT "Matches_pkey" PRIMARY KEY (id);


--
-- Name: Outcomes Outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Outcomes"
    ADD CONSTRAINT "Outcomes_pkey" PRIMARY KEY (id);


--
-- Name: Platforms Platforms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Platforms"
    ADD CONSTRAINT "Platforms_pkey" PRIMARY KEY (id);


--
-- Name: Arbitrages Arbitrages_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Arbitrages"
    ADD CONSTRAINT "Arbitrages_match_id_fkey" FOREIGN KEY (match_id) REFERENCES public."Matches"(id) ON UPDATE CASCADE;


--
-- Name: Arbitrages Arbitrages_outcome_id_kalshi_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Arbitrages"
    ADD CONSTRAINT "Arbitrages_outcome_id_kalshi_fkey" FOREIGN KEY (outcome_id_kalshi) REFERENCES public."Outcomes"(id) ON UPDATE CASCADE;


--
-- Name: Arbitrages Arbitrages_outcome_id_polymarket_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Arbitrages"
    ADD CONSTRAINT "Arbitrages_outcome_id_polymarket_fkey" FOREIGN KEY (outcome_id_polymarket) REFERENCES public."Outcomes"(id) ON UPDATE CASCADE;


--
-- Name: Markets Markets_platform_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Markets"
    ADD CONSTRAINT "Markets_platform_id_fkey" FOREIGN KEY (platform_id) REFERENCES public."Platforms"(id) ON UPDATE CASCADE;


--
-- Name: Matches Matches_kalshi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Matches"
    ADD CONSTRAINT "Matches_kalshi_id_fkey" FOREIGN KEY (kalshi_id) REFERENCES public."Markets"(id) ON UPDATE CASCADE;


--
-- Name: Matches Matches_polymarket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Matches"
    ADD CONSTRAINT "Matches_polymarket_id_fkey" FOREIGN KEY (polymarket_id) REFERENCES public."Markets"(id) ON UPDATE CASCADE;


--
-- Name: Outcomes Outcomes_market_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Outcomes"
    ADD CONSTRAINT "Outcomes_market_id_fkey" FOREIGN KEY (market_id) REFERENCES public."Markets"(id) ON UPDATE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict FN4JzuzEGObXtTWgI3nQH8C8KWFHY7HZU3OZ4Qws1SM7uvb67q7kf9dMZcYdni3

