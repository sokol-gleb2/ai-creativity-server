CREATE TABLE events (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    location TEXT,
    detail TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type TEXT CHECK (type IN ('Conference', 'Meetup', 'Workshop'))
);

CREATE TABLE groups (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    detail TEXT,
    member_count INTEGER CHECK (member_count >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category TEXT CHECK (category IN ('Sports', 'Music', 'Tech'))
);

CREATE TABLE profiles (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER CHECK (age >= 0),
    detail TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type TEXT CHECK (type IN ('Student', 'Teacher', 'Admin'))
);

CREATE TABLE embeddings (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL,
    item_type TEXT CHECK (item_type IN ('event', 'group', 'profile')),
    embedding VECTOR(1536) NOT NULL
);