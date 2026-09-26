# Teknik-O Supabase schema

Apply the numbered SQL files in `migrations/` in order to the Teknik-O-Demo
project (`dvrjwsbfircyngjggdxx`). Each file is transactional and repeatable.
Run `verify_core_schema.sql` before and after applying, and retain the output.
Do not apply to a different project without reviewing its live inventory.

The 2026-09-26 live preflight found seven tables: `users`,
`customer_profiles`, `technician_profiles`, `customer_adresses`,
`service_requests`, `diagnostic_logs`, and `official_error_codes_raw`.
The manually created address table and its `adress_line` column are misspelled.
The migration renames both in place; it does not copy or drop the table.
All tables except `official_error_codes_raw` were empty. The raw table had
exactly 1,422 rows. No RLS policies existed. RLS was enabled on the raw table
and the three manually created profile/address tables, but disabled on
`users`, `service_requests`, and `diagnostic_logs`.

The first migration aborts if the raw row count differs from 1,422 or an
existing FK conflicts with the target. The second aborts if an unrecognized
RLS policy exists. No city/district or service-type data is invented.

Client access is intentionally limited: authenticated users can read their own
account, profiles, addresses, requests and related logs. Customers can manage
their own addresses; approved technicians can change only availability.
Authenticated users can read active catalog rows and the raw manufacturer
table. Account provisioning, technician approval, catalog administration,
service request/log writes and technician assignments require a trusted server
using `service_role`; never put that key in the browser. The SQL admin helper
can read admin status without recursive RLS, and client-side grants cannot
change account roles or approval status.

Running SQL files through the dashboard SQL Editor does not populate the
Supabase CLI migration history. If applying through the dashboard, reconcile
the CLI history before a later `supabase db push`; never re-baseline by
dropping production tables.
