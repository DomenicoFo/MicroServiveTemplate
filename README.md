# MicroServiveTemplate

A configurable microservice template built with **Node.js**, **TypeScript**, and **Express**.

The microservice exposes a dedicated **configuration API** that lets administrators manage all service settings at runtime — no restart required.

---

## Features

| Feature | Description |
|---|---|
| **Configuration API** | REST endpoints to read and update service configuration |
| **Hot-reload** | Config file is watched; changes take effect immediately without restarting the server |
| **DB Configuration** | Configure the database instance (host, port, name, credentials, SSL) |
| **API Connectors** | Define external services and API connectors; attach a Swagger/OpenAPI spec to each |
| **Swagger Upload** | Upload a `.yaml`, `.yml`, or `.json` Swagger file per connector |
| **Admin Role** | Write operations are restricted to users with the `admin` role |
| **JWT Auth** | Stateless authentication using JSON Web Tokens |
| **Docker Ready** | Dockerfile + docker-compose for containerised deployments |

---

## Quick Start

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy and customise the environment file
cp .env.example .env

# 3. Start in development mode (with hot-reload)
npm run dev
```

The server starts on **http://localhost:3000**.

### Docker

```bash
docker-compose up --build
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port the server listens on |
| `JWT_SECRET` | `changeme_secret` | Secret used to sign JWTs – **change in production** |
| `JWT_EXPIRES_IN` | `24h` | JWT expiry duration |
| `ADMIN_USERNAME` | `admin` | Default admin username (created on first startup) |
| `ADMIN_PASSWORD` | `admin123` | Default admin password – **change in production** |
| `CONFIG_FILE_PATH` | `./config/microservice.config.json` | Path to the runtime config file |
| `UPLOADS_DIR` | `./uploads` | Directory where Swagger files are stored |

---

## API Reference

### Health

```
GET /health
```

### Authentication

```
POST /auth/login
Body: { "username": "admin", "password": "admin123" }
Response: { "token": "<jwt>" }
```

### Configuration (requires Bearer token)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/config` | any | Get full configuration |
| `PUT` | `/config` | admin | Update name, description, version, database config |
| `GET` | `/config/connectors` | any | List all API connectors |
| `POST` | `/config/connectors` | admin | Create a new API connector |
| `PUT` | `/config/connectors/:id` | admin | Update an API connector |
| `DELETE` | `/config/connectors/:id` | admin | Delete an API connector |
| `POST` | `/config/connectors/:id/swagger` | admin | Upload a Swagger file (multipart `swagger` field) |
| `GET` | `/config/connectors/:id/swagger` | any | Download the Swagger file for a connector |

---

## Configuration File Structure

The configuration is persisted in `config/microservice.config.json`:

```json
{
  "name": "My Microservice",
  "description": "A configurable microservice template",
  "version": "1.0.0",
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "microservice_db",
    "user": "dbuser",
    "password": "",
    "ssl": false
  },
  "apiConnectors": [
    {
      "id": "...",
      "name": "Payment API",
      "description": "Handles payment processing",
      "baseUrl": "https://api.payments.example.com",
      "swaggerFile": "/app/uploads/1234567890-payment-api.yaml",
      "enabled": true
    }
  ],
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

---

## Hot-Reload

The config file is watched using Node's `fs.watch`. Any external edit to the file is automatically picked up within ~300 ms without restarting the service.

---

## Running Tests

```bash
npm test
```

---

## Build

```bash
npm run build   # Compiles TypeScript → dist/
npm start       # Runs the compiled output
```
