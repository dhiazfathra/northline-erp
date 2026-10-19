-- ADR-0031: average cost keeps fractions of a cent on stock moves (Accurate carries 563.333,333...); journals still post whole cents.
ALTER TABLE stock_moves ALTER COLUMN value TYPE numeric;
