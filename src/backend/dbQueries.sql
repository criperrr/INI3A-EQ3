CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- fuzzy/trigram search (PRD: Should Have)
CREATE EXTENSION IF NOT EXISTS unaccent;  -- normalize accented chars in search

CREATE TABLE scope (
    id          SERIAL PRIMARY KEY,
    scope_name  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE role (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL UNIQUE,
    min_points  INT          NOT NULL DEFAULT 0 CHECK (min_points >= 0)
);

CREATE TABLE role_scope (
    role_id   INT NOT NULL REFERENCES role(id)  ON DELETE CASCADE,
    scope_id  INT NOT NULL REFERENCES scope(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, scope_id)
);

CREATE TABLE "user" (
    id            SERIAL PRIMARY KEY, 
    name          VARCHAR(100)        NOT NULL,
    email         VARCHAR(255)        NOT NULL UNIQUE,
    pass_hash     VARCHAR(255)        NOT NULL,
    refresh_token TEXT,
    age           SMALLINT            CHECK (age > 0 AND age < 120),
    points        INT                 NOT NULL DEFAULT 0 CHECK (points >= 0),
    danger_flag   BOOLEAN             NOT NULL DEFAULT FALSE,
    location      GEOGRAPHY(POINT, 4326),        -- replaces lat / lgt columns
    role_id       INT                 NOT NULL REFERENCES role(id),
    created_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Spatial index for proximity queries ("find users near market")
CREATE INDEX idx_user_location ON "user" USING GIST (location);
-- Fast lookup by role for bulk role-promotion commits
CREATE INDEX idx_user_role_id  ON "user" (role_id);

CREATE TABLE badge (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    icon        TEXT,                            -- URL or base-64 icon
    min_points  INT          NOT NULL DEFAULT 0 CHECK (min_points >= 0)
);

CREATE TABLE user_badge (
    user_id    INT         NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    badge_id   INT         NOT NULL REFERENCES badge(id)  ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE product (
    id           SERIAL PRIMARY KEY,
    ean          TEXT ,
    ncm          VARCHAR(10),
    name         VARCHAR(200) NOT NULL,
    description  TEXT,
    icon         TEXT,                            -- URL / CDN path
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_ncm ON product (ncm);
CREATE INDEX idx_product_ean ON product (ean) WHERE ean IS NOT NULL;

CREATE INDEX idx_product_name_trgm ON product USING GIN (name gin_trgm_ops);

CREATE TABLE market (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(200) NOT NULL,
    location     GEOGRAPHY(POINT, 4326) NOT NULL,  -- replaces lat / lgt
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW
);

CREATE INDEX idx_market_location ON market USING GIST (location);

CREATE TABLE ocurrency (
    id              SERIAL PRIMARY KEY,
    user_id         INT             NOT NULL REFERENCES "user"(id),
    market_id       INT             NOT NULL REFERENCES market(id),
    product_id      INT             NOT NULL REFERENCES product(id),
    value           NUMERIC(12, 2)  NOT NULL CHECK (value > 0),  -- the observed price
    icon            TEXT,                                         -- optional photo proof
    created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    trust_flag      BOOLEAN         NOT NULL DEFAULT TRUE,
    is_suspended    BOOLEAN         NOT NULL DEFAULT FALSE,
    is_resolved     BOOLEAN         NOT NULL DEFAULT FALSE,       -- PRD §4.4 Phase 4
    upvote_count    INT             NOT NULL DEFAULT 0 CHECK (upvote_count   >= 0),
    downvote_count  INT             NOT NULL DEFAULT 0 CHECK (downvote_count >= 0),
    -- volate: derived — TRUE when the Mathematical Filter (Layer 1) flags anomaly
    volate          BOOLEAN         NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_post_unresolved    ON post (is_resolved, date) WHERE is_resolved = FALSE;
CREATE INDEX idx_post_market_date   ON post (market_id,   date DESC);
CREATE INDEX idx_post_product_date  ON post (product_id,  date DESC);

CREATE TABLE cured (
    user_id   INT         NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    post_id   INT         NOT NULL REFERENCES post(id)   ON DELETE CASCADE,
    verdict   BOOLEAN     NOT NULL,   -- TRUE = upvote / trustworthy; FALSE = downvote
    date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_cured_post_date ON cured (post_id, date ASC);

CREATE TABLE cart (
    id         SERIAL PRIMARY KEY,
    user_id    INT         NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_product (
    cart_id    INT NOT NULL REFERENCES cart(id)    ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cart_id, product_id)
);

COMMENT ON TABLE cart_product IS 'Products tracked inside a shopping cart.';