# Darbak | دربك

<p align="center">
  <img src="docs/images/darbak-logo.png" alt="Darbak logo — دربك" width="280">
</p>

A ride-sharing and match-planning platform for football fans attending the Asian Cup in Saudi Arabia. Fans can offer seats, request rides, save matches, and use AI to help plan their matchday.

## Features

- Ride search, car availability checks, and seat reservations.
- Driver acceptance/rejection of requests and passenger management.
- Saved matches, ride recommendations, and matches without arranged rides.
- Google Maps meeting points and directions links.
- AI matchday plans, two-match attendance estimates, review moderation, and review summaries.
- User ratings/statistics, automatic WhatsApp notifications, and welcome emails.
- Match/stadium management, Football API fixture import, and user banning.

## Technology

Java 17 · Spring Boot · Spring Data JPA/Hibernate · MySQL · Jakarta Validation · Lombok · Maven

Integrations: OpenRouter AI, Google Maps JavaScript, API-Football, UltraMsg WhatsApp, Spring Mail/Gmail SMTP, and OpenPDF. The demo frontend uses plain HTML, CSS, and JavaScript.

## Extra endpoints

### Abdullah — 11 endpoints

All paths start with `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/match/stadium/{stadiumId}` | Matches at a stadium |
| GET | `/match/team/{teamName}` | Matches involving a team |
| GET | `/match/city/{city}` | Matches in a city |
| GET | `/user/{userId}/matches` | User’s saved matches |
| POST | `/user/{userId}/matches/{matchId}` | Save match |
| DELETE | `/user/{userId}/matches/{matchId}` | Remove saved match |
| GET | `/Ride/recommendations/user/{userId}` | Recommend available rides |
| GET | `/user/{userId}/matches/without-rides` | Saved matches without rides |
| PUT | `/admin/ban/{userId}` | Ban user |
| POST | `/stadium/add-all` | Add stadiums in bulk |
| GET | `/Ride/map/{rideId}` | Map details and directions links |
