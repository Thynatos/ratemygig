-- ============================================
-- Seed mock catalog (UUIDs aligned with packages/db/seed/mock-events.json)
-- Migration: 006_seed_mock_catalog.sql
-- ============================================

-- Venues
INSERT INTO public.venues (id, name, city, country, lat, lng, provider_venue_id) VALUES
  ('b0000001-0000-4000-8000-000000000001', 'Madison Square Garden', 'New York', 'USA', 40.7505, -73.9934, 'mock-v-001'),
  ('b0000001-0000-4000-8000-000000000002', 'The O2 Arena', 'London', 'UK', 51.503, 0.0032, 'mock-v-002'),
  ('b0000001-0000-4000-8000-000000000003', 'Red Rocks Amphitheatre', 'Denver', 'USA', 39.6655, -105.2057, 'mock-v-003'),
  ('b0000001-0000-4000-8000-000000000004', 'Hollywood Bowl', 'Los Angeles', 'USA', 34.1122, -118.3391, 'mock-v-004'),
  ('b0000001-0000-4000-8000-000000000005', 'Brixton Academy', 'London', 'UK', 51.4652, -0.1149, 'mock-v-005'),
  ('b0000001-0000-4000-8000-000000000006', 'The Fillmore', 'San Francisco', 'USA', 37.784, -122.433, 'mock-v-006'),
  ('b0000001-0000-4000-8000-000000000007', 'Wembley Stadium', 'London', 'UK', 51.556, -0.2795, 'mock-v-007'),
  ('b0000001-0000-4000-8000-000000000008', 'Barclays Center', 'New York', 'USA', 40.6826, -73.9754, 'mock-v-008')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  country = EXCLUDED.country,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  provider_venue_id = EXCLUDED.provider_venue_id;

-- Artists
INSERT INTO public.artists (id, name, provider_artist_id) VALUES
  ('b0000002-0000-4000-8000-000000000001', 'Taylor Swift', 'mock-a-001'),
  ('b0000002-0000-4000-8000-000000000002', 'The Weeknd', 'mock-a-002'),
  ('b0000002-0000-4000-8000-000000000003', 'Coldplay', 'mock-a-003'),
  ('b0000002-0000-4000-8000-000000000004', 'Ed Sheeran', 'mock-a-004'),
  ('b0000002-0000-4000-8000-000000000005', 'Bruno Mars', 'mock-a-005'),
  ('b0000002-0000-4000-8000-000000000006', 'Beyoncé', 'mock-a-006'),
  ('b0000002-0000-4000-8000-000000000007', 'Arctic Monkeys', 'mock-a-007'),
  ('b0000002-0000-4000-8000-000000000008', 'Foo Fighters', 'mock-a-008'),
  ('b0000002-0000-4000-8000-000000000009', 'Dua Lipa', 'mock-a-009'),
  ('b0000002-0000-4000-8000-00000000000a', 'Harry Styles', 'mock-a-010'),
  ('b0000002-0000-4000-8000-00000000000b', 'Kendrick Lamar', 'mock-a-011'),
  ('b0000002-0000-4000-8000-00000000000c', 'Billie Eilish', 'mock-a-012')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  provider_artist_id = EXCLUDED.provider_artist_id;

-- Events (lineup = headliner names for display; event_artists holds M:N)
INSERT INTO public.events (id, provider, provider_event_id, name, start_at, city, country, venue_id, ticket_urls, lineup) VALUES
  ('b0000003-0000-4000-8000-000000000001', 'mock', 'mock-e-001', 'Taylor Swift - The Eras Tour', '2026-03-15T20:00:00+00', 'New York', 'USA', 'b0000001-0000-4000-8000-000000000001', '[{"label":"Ticketmaster","url":"https://www.ticketmaster.com/taylor-swift"},{"label":"StubHub","url":"https://www.stubhub.com"}]'::jsonb, '["Taylor Swift"]'::jsonb),
  ('b0000003-0000-4000-8000-000000000002', 'mock', 'mock-e-002', 'The Weeknd - After Hours Tour', '2026-03-22T21:00:00+00', 'London', 'UK', 'b0000001-0000-4000-8000-000000000002', '[{"label":"Ticketmaster","url":"https://www.ticketmaster.co.uk/the-weeknd"}]'::jsonb, '["The Weeknd"]'::jsonb),
  ('b0000003-0000-4000-8000-000000000003', 'mock', 'mock-e-003', 'Coldplay - Music of the Spheres', '2026-04-05T19:30:00+00', 'London', 'UK', 'b0000001-0000-4000-8000-000000000007', '[{"label":"AXS","url":"https://www.axs.com/coldplay"}]'::jsonb, '["Coldplay"]'::jsonb),
  ('b0000003-0000-4000-8000-000000000004', 'mock', 'mock-e-004', 'Ed Sheeran - Mathematics Tour', '2026-04-12T20:00:00+00', 'Denver', 'USA', 'b0000001-0000-4000-8000-000000000003', '[{"label":"Ticketmaster","url":"https://www.ticketmaster.com/ed-sheeran"}]'::jsonb, '["Ed Sheeran"]'::jsonb),
  ('b0000003-0000-4000-8000-000000000005', 'mock', 'mock-e-005', 'Bruno Mars - 24K Magic World Tour', '2026-04-20T20:30:00+00', 'Los Angeles', 'USA', 'b0000001-0000-4000-8000-000000000004', '[{"label":"Live Nation","url":"https://www.livenation.com/bruno-mars"}]'::jsonb, '["Bruno Mars"]'::jsonb),
  ('b0000003-0000-4000-8000-000000000006', 'mock', 'mock-e-006', 'Beyoncé - Renaissance World Tour', '2026-05-01T20:00:00+00', 'New York', 'USA', 'b0000001-0000-4000-8000-000000000001', '[{"label":"Ticketmaster","url":"https://www.ticketmaster.com/beyonce"},{"label":"VividSeats","url":"https://www.vividseats.com"}]'::jsonb, '["Beyoncé"]'::jsonb),
  ('b0000003-0000-4000-8000-000000000007', 'mock', 'mock-e-007', 'Arctic Monkeys - The Car Tour', '2026-05-10T21:00:00+00', 'London', 'UK', 'b0000001-0000-4000-8000-000000000005', '[{"label":"See Tickets","url":"https://www.seetickets.com/arctic-monkeys"}]'::jsonb, '["Arctic Monkeys"]'::jsonb),
  ('b0000003-0000-4000-8000-000000000008', 'mock', 'mock-e-008', 'Foo Fighters - Everything or Nothing Tour', '2026-05-18T19:00:00+00', 'Denver', 'USA', 'b0000001-0000-4000-8000-000000000003', '[{"label":"Ticketmaster","url":"https://www.ticketmaster.com/foo-fighters"}]'::jsonb, '["Foo Fighters"]'::jsonb),
  ('b0000003-0000-4000-8000-000000000009', 'mock', 'mock-e-009', 'Dua Lipa - Future Nostalgia Tour', '2026-06-01T20:00:00+00', 'San Francisco', 'USA', 'b0000001-0000-4000-8000-000000000006', '[{"label":"Ticketmaster","url":"https://www.ticketmaster.com/dua-lipa"}]'::jsonb, '["Dua Lipa"]'::jsonb),
  ('b0000003-0000-4000-8000-00000000000a', 'mock', 'mock-e-010', 'Harry Styles - Love On Tour', '2026-06-15T20:30:00+00', 'New York', 'USA', 'b0000001-0000-4000-8000-000000000008', '[{"label":"Ticketmaster","url":"https://www.ticketmaster.com/harry-styles"}]'::jsonb, '["Harry Styles"]'::jsonb),
  ('b0000003-0000-4000-8000-00000000000b', 'mock', 'mock-e-011', 'Kendrick Lamar - The Big Steppers Tour', '2026-06-25T21:00:00+00', 'Los Angeles', 'USA', 'b0000001-0000-4000-8000-000000000004', '[{"label":"Live Nation","url":"https://www.livenation.com/kendrick-lamar"}]'::jsonb, '["Kendrick Lamar"]'::jsonb),
  ('b0000003-0000-4000-8000-00000000000c', 'mock', 'mock-e-012', 'Billie Eilish - Happier Than Ever Tour', '2026-07-04T20:00:00+00', 'London', 'UK', 'b0000001-0000-4000-8000-000000000002', '[{"label":"Ticketmaster","url":"https://www.ticketmaster.co.uk/billie-eilish"}]'::jsonb, '["Billie Eilish"]'::jsonb),
  ('b0000003-0000-4000-8000-00000000000d', 'mock', 'mock-e-013', 'Summer Festival 2026', '2026-07-15T14:00:00+00', 'Denver', 'USA', 'b0000001-0000-4000-8000-000000000003', '[{"label":"Festival Tickets","url":"https://example.com/summer-fest"}]'::jsonb, '["Coldplay","Ed Sheeran","Dua Lipa"]'::jsonb),
  ('b0000003-0000-4000-8000-00000000000e', 'mock', 'mock-e-014', 'NYC Music Week - Opening Night', '2026-08-01T19:00:00+00', 'New York', 'USA', 'b0000001-0000-4000-8000-000000000001', '[{"label":"NYC Music Week","url":"https://example.com/nyc-music-week"}]'::jsonb, '["The Weeknd","Bruno Mars","Kendrick Lamar"]'::jsonb),
  ('b0000003-0000-4000-8000-00000000000f', 'mock', 'mock-e-015', 'London Calling Festival', '2026-08-10T13:00:00+00', 'London', 'UK', 'b0000001-0000-4000-8000-000000000007', '[{"label":"London Calling","url":"https://example.com/london-calling"}]'::jsonb, '["Arctic Monkeys","Foo Fighters","Harry Styles"]'::jsonb),
  ('b0000003-0000-4000-8000-000000000010', 'mock', 'mock-e-016', 'The Weeknd - Special Intimate Show', '2026-09-01T21:00:00+00', 'London', 'UK', 'b0000001-0000-4000-8000-000000000005', '[{"label":"AXS","url":"https://www.axs.com/weeknd-special"}]'::jsonb, '["The Weeknd"]'::jsonb),
  ('b0000003-0000-4000-8000-000000000011', 'mock', 'mock-e-017', 'Taylor Swift - Surprise Acoustic Night', '2026-09-15T20:00:00+00', 'San Francisco', 'USA', 'b0000001-0000-4000-8000-000000000006', '[{"label":"Ticketmaster","url":"https://www.ticketmaster.com/taylor-acoustic"}]'::jsonb, '["Taylor Swift"]'::jsonb),
  ('b0000003-0000-4000-8000-000000000012', 'mock', 'mock-e-018', 'Fall Music Fest', '2026-10-01T15:00:00+00', 'Los Angeles', 'USA', 'b0000001-0000-4000-8000-000000000004', '[{"label":"Live Nation","url":"https://www.livenation.com/fall-fest"}]'::jsonb, '["Beyoncé","Dua Lipa","Billie Eilish"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  provider = EXCLUDED.provider,
  provider_event_id = EXCLUDED.provider_event_id,
  name = EXCLUDED.name,
  start_at = EXCLUDED.start_at,
  city = EXCLUDED.city,
  country = EXCLUDED.country,
  venue_id = EXCLUDED.venue_id,
  ticket_urls = EXCLUDED.ticket_urls,
  lineup = EXCLUDED.lineup,
  updated_at = NOW();

-- event_artists (billing order)
INSERT INTO public.event_artists (event_id, artist_id, billing_order) VALUES
  ('b0000003-0000-4000-8000-000000000001', 'b0000002-0000-4000-8000-000000000001', 1),
  ('b0000003-0000-4000-8000-000000000002', 'b0000002-0000-4000-8000-000000000002', 1),
  ('b0000003-0000-4000-8000-000000000003', 'b0000002-0000-4000-8000-000000000003', 1),
  ('b0000003-0000-4000-8000-000000000004', 'b0000002-0000-4000-8000-000000000004', 1),
  ('b0000003-0000-4000-8000-000000000005', 'b0000002-0000-4000-8000-000000000005', 1),
  ('b0000003-0000-4000-8000-000000000006', 'b0000002-0000-4000-8000-000000000006', 1),
  ('b0000003-0000-4000-8000-000000000007', 'b0000002-0000-4000-8000-000000000007', 1),
  ('b0000003-0000-4000-8000-000000000008', 'b0000002-0000-4000-8000-000000000008', 1),
  ('b0000003-0000-4000-8000-000000000009', 'b0000002-0000-4000-8000-000000000009', 1),
  ('b0000003-0000-4000-8000-00000000000a', 'b0000002-0000-4000-8000-00000000000a', 1),
  ('b0000003-0000-4000-8000-00000000000b', 'b0000002-0000-4000-8000-00000000000b', 1),
  ('b0000003-0000-4000-8000-00000000000c', 'b0000002-0000-4000-8000-00000000000c', 1),
  ('b0000003-0000-4000-8000-00000000000d', 'b0000002-0000-4000-8000-000000000003', 1),
  ('b0000003-0000-4000-8000-00000000000d', 'b0000002-0000-4000-8000-000000000004', 2),
  ('b0000003-0000-4000-8000-00000000000d', 'b0000002-0000-4000-8000-000000000009', 3),
  ('b0000003-0000-4000-8000-00000000000e', 'b0000002-0000-4000-8000-000000000002', 1),
  ('b0000003-0000-4000-8000-00000000000e', 'b0000002-0000-4000-8000-000000000005', 2),
  ('b0000003-0000-4000-8000-00000000000e', 'b0000002-0000-4000-8000-00000000000b', 3),
  ('b0000003-0000-4000-8000-00000000000f', 'b0000002-0000-4000-8000-000000000007', 1),
  ('b0000003-0000-4000-8000-00000000000f', 'b0000002-0000-4000-8000-000000000008', 2),
  ('b0000003-0000-4000-8000-00000000000f', 'b0000002-0000-4000-8000-00000000000a', 3),
  ('b0000003-0000-4000-8000-000000000010', 'b0000002-0000-4000-8000-000000000002', 1),
  ('b0000003-0000-4000-8000-000000000011', 'b0000002-0000-4000-8000-000000000001', 1),
  ('b0000003-0000-4000-8000-000000000012', 'b0000002-0000-4000-8000-000000000006', 1),
  ('b0000003-0000-4000-8000-000000000012', 'b0000002-0000-4000-8000-000000000009', 2),
  ('b0000003-0000-4000-8000-000000000012', 'b0000002-0000-4000-8000-00000000000c', 3)
ON CONFLICT (event_id, artist_id) DO UPDATE SET billing_order = EXCLUDED.billing_order;
