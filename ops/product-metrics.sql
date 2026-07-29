WITH
event_counts AS (
  SELECT
    COUNT(DISTINCT CASE WHEN name = 'visited' THEN session_id END) AS users,
    COUNT(DISTINCT CASE WHEN name = 'event_viewed' THEN session_id END) AS viewers,
    COUNT(DISTINCT CASE WHEN name = 'event_viewed' THEN context END) AS events_viewed,
    COUNT(DISTINCT CASE WHEN name = 'join_opened' THEN session_id END) AS outbound_users,
    COUNT(DISTINCT CASE WHEN name = 'join_opened' THEN context END) AS events_with_outbound,
    COUNT(DISTINCT CASE WHEN name = 'calendar_added' THEN session_id END) AS calendar_users,
    COUNT(DISTINCT CASE WHEN name = 'share_copied' THEN session_id END) AS sharing_users,
    COUNT(DISTINCT CASE WHEN name = 'participation_confirmed' THEN session_id END)
      AS confirmed_users,
    COUNT(DISTINCT CASE WHEN name = 'returned' THEN session_id END) AS returned_users,
    COUNT(DISTINCT CASE
      WHEN name = 'visited' AND occurred_on >= date('now', '-6 days') THEN session_id
    END) AS users_7d,
    COUNT(DISTINCT CASE
      WHEN name IN ('join_opened', 'calendar_added')
        AND occurred_on >= date('now', '-6 days') THEN session_id
    END) AS completed_users_7d
  FROM product_events
),
listing_counts AS (
  SELECT
    COUNT(*) AS events_created,
    COUNT(CASE WHEN status = 'active' AND ends_at > unixepoch() THEN 1 END)
      AS active_events,
    COUNT(CASE WHEN status = 'hidden' THEN 1 END) AS hidden_events,
    COUNT(DISTINCT creator_session_id) AS organizers,
    COUNT(CASE WHEN created_at >= unixepoch() - (7 * 86400) THEN 1 END)
      AS events_7d,
    COUNT(DISTINCT CASE
      WHEN created_at >= unixepoch() - (7 * 86400) THEN creator_session_id
    END) AS organizers_7d
  FROM events
),
organizer_outcomes AS (
  SELECT
    COUNT(DISTINCT CASE WHEN viewed.context IS NOT NULL THEN events.creator_session_id END)
      AS organizers_with_views,
    COUNT(DISTINCT CASE
      WHEN completed.context IS NOT NULL THEN events.creator_session_id
    END) AS organizers_with_completion
  FROM events
  LEFT JOIN (
    SELECT DISTINCT context FROM product_events WHERE name = 'event_viewed'
  ) AS viewed ON viewed.context = events.id
  LEFT JOIN (
    SELECT DISTINCT
      CASE
        WHEN instr(context, ':') > 0 THEN substr(context, 1, instr(context, ':') - 1)
        ELSE context
      END AS context
    FROM product_events
    WHERE name IN ('join_opened', 'calendar_added')
  ) AS completed ON completed.context = events.id
),
report_counts AS (
  SELECT COUNT(*) AS reports FROM reports
)
SELECT
  event_counts.*,
  listing_counts.*,
  organizer_outcomes.*,
  report_counts.reports
FROM event_counts, listing_counts, organizer_outcomes, report_counts;
