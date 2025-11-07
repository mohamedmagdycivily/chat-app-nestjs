# Chat Service

## Configuration

To configure the Chat service, check the `.env.example` file for an example configuration.

---

## Installation and Running the Service

1. Clone the repository:

   ```bash
   git clone <repo endpoint>
   ```

2. Install dependencies:
   ```bash
   cd chat-service
   npm install
   cp .env.example .env
   ```
3. Run docker compose to start the service:

   ```bash
   docker compose up --build --force-recreate
   ```

4. The service will start at `http://localhost:3000` by default.
5. The rabbitmq management console will be available at `http://localhost:15672` with credentials `admin:admin`.

---

## License

UNLICENSED
