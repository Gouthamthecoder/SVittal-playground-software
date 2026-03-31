# Play Area Dashboard

A full-stack dashboard for managing kids in a play area facility.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js (TypeScript, tsx)
- **Database**: PostgreSQL via Drizzle ORM
- **Port**: 5000 (serves both API and frontend)

## Features

- **Dashboard**: Real-time floor status for active kids, with search/filter by name or status
- **New Entry Form**: Add kids with mandatory child socks ID, optional parent socks, hours of play, parents count, and custom fields
- **Extend Time**: Extend a kid's play session by 30 mins or 1 hour
- **End Session**: Removes kid from active floor and records out-time in the database
- **Metrics**: Date-filtered view of all sessions with hourly check-in chart, socks tracking, and session table
- **CSV Export**: Download all sessions for a selected date as a CSV file

## Database Schema

### `sessions` table
| Column | Type | Description |
|---|---|---|
| id | serial (PK) | Auto-incremented session ID |
| kid_name | text | Child's name |
| child_socks | text | Mandatory child socks ID |
| parent_socks | text | Optional parent socks ID |
| parents_count | real | Number of parents |
| hours_of_play | real | Booked play time in hours |
| custom_fields | jsonb | Array of {id, label, value} custom fields |
| in_time | timestamp | Check-in time |
| out_time | timestamp | Check-out time (null if still active) |
| date | text | Date string (YYYY-MM-DD) for easy filtering |

## API Routes

| Method | Path | Description |
|---|---|---|
| POST | /api/sessions | Create a new session (check-in) |
| PATCH | /api/sessions/:id/end | End a session (check-out) |
| GET | /api/sessions?date=YYYY-MM-DD | Get sessions by date |
| GET | /api/sessions/export?date=YYYY-MM-DD | Download sessions as CSV |

## Running

```bash
npm run dev        # Start development server
npm run db:push    # Push schema changes to database
npm run build      # Build for production
```
