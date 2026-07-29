CREATE TABLE events (
  id TEXT PRIMARY KEY CHECK(length(id) = 32),
  owner_token_hash TEXT NOT NULL CHECK(length(owner_token_hash) = 64),
  creator_session_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 40),
  organizer TEXT NOT NULL CHECK(length(organizer) BETWEEN 1 AND 30),
  platform TEXT NOT NULL CHECK(platform IN ('vrchat', 'cluster', 'resonite')),
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  frequency TEXT NOT NULL CHECK(frequency IN ('once', 'weekly', 'biweekly')),
  device_pc INTEGER NOT NULL DEFAULT 0 CHECK(device_pc IN (0, 1)),
  device_standalone INTEGER NOT NULL DEFAULT 0 CHECK(device_standalone IN (0, 1)),
  device_mobile INTEGER NOT NULL DEFAULT 0 CHECK(device_mobile IN (0, 1)),
  category TEXT NOT NULL CHECK(category IN ('social', 'music', 'game', 'creative', 'learning', 'performance', 'other')),
  access_method TEXT NOT NULL CHECK(access_method IN ('public', 'group', 'friend', 'invite')),
  beginner_welcome INTEGER NOT NULL DEFAULT 0 CHECK(beginner_welcome IN (0, 1)),
  summary TEXT NOT NULL DEFAULT '' CHECK(length(summary) <= 160),
  join_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed', 'hidden')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK(ends_at > starts_at),
  CHECK(ends_at - starts_at <= 28800)
);

CREATE INDEX events_public_schedule
ON events(status, starts_at, updated_at);

CREATE INDEX events_creator_rate
ON events(creator_session_id, created_at);

CREATE TABLE reports (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reporter_session_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK(reason IN ('dead', 'contact', 'adult', 'fake', 'spam', 'unsafe')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (event_id, reporter_session_id)
);

CREATE TABLE product_events (
  session_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK(name IN (
    'visited',
    'filters_used',
    'event_created',
    'event_viewed',
    'share_copied',
    'calendar_added',
    'join_opened',
    'participation_confirmed',
    'returned'
  )),
  context TEXT NOT NULL DEFAULT '',
  occurred_on TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (session_id, name, context, occurred_on)
);

CREATE INDEX product_events_created_at
ON product_events(created_at);
