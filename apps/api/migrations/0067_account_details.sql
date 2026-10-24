-- ADR-0049 (N1): Akun Perkiraan form fields the ledger's accounts table does not hold. No FK: the account row arrives via
-- the async projection, and the form saves details right after OpenAccount.
CREATE TABLE account_details (
  account_no text PRIMARY KEY,
  note       text    NOT NULL DEFAULT '',
  bank       text    NOT NULL DEFAULT '',
  acc_no     text    NOT NULL DEFAULT '',
  acc_name   text    NOT NULL DEFAULT '',
  all_users  boolean NOT NULL DEFAULT true,
  users      jsonb   NOT NULL DEFAULT '[]'
);
