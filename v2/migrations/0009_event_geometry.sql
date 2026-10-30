-- Optional event geometry; populated only when an approved source's signed publication provides coordinates.
ALTER TABLE harvy_v2_events ADD COLUMN latitude REAL;
ALTER TABLE harvy_v2_events ADD COLUMN longitude REAL;
