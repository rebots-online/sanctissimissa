## start (2026-07-16T00:46:45.839307+00:00)
### operator_input
operator: implement Global Workflow Everything dual archive

### accepted_plan
1) dual-write session-archive 2) rewrite everything.md 3) smoke LOGS+Postgres

### commands_to_issue
session-archive begin; turn-start; mid-turn; turn-end; status; ls LOGS

### gate
EXECUTE only after this turn-start is archived (LOGS + Postgres).

