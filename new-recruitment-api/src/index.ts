import { setupDb } from "./db";
import { setupApp } from "./app";
import { env } from "./config/env";
import { Server } from "http";
import { Database } from "sqlite";

let server: Server | null = null;
let db: Database | null = null;

async function main(): Promise<void> {
    try {
        db = await setupDb();
        const app = await setupApp(db);

        server = app.listen(env.PORT, () => {
            console.log(`[server]: Server is running at http://localhost:${env.PORT}`);
        });

        setupGracefulShutdown();
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

function setupGracefulShutdown(): void {
    const shutdown = async (signal: string): Promise<void> => {
        console.log(`\n${signal} received. Starting graceful shutdown...`);

        if (server) {
            server.close(async () => {
                console.log("HTTP server closed");

                if (db) {
                    await db.close();
                    console.log("Database connection closed");
                }

                console.log("Graceful shutdown complete");
                process.exit(0);
            });

            setTimeout(() => {
                console.error("Forceful shutdown after timeout");
                process.exit(1);
            }, 10000);
        }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}

main();
