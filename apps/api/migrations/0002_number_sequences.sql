-- Write-side support: Accurate-style document numbers (JV.yyyy.mm.nnnnn), one counter per prefix,
-- incremented inside the command transaction so the number is fixed in the JournalPosted event.
CREATE TABLE number_sequences (
  prefix text PRIMARY KEY,
  last   integer NOT NULL
);
