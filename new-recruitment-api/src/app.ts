import express, { Express } from "express";
import { Database } from "sqlite";
import rateLimit from "express-rate-limit";
import { CandidatesController } from "./controllers/candidates.controller";
import { CandidatesRepository } from "./repositories/candidates.repository";
import { CandidatesService } from "./services/candidates.service";
import { LegacyApiService } from "./services/legacy-api.service";
import { errorHandler } from "./middlewares/error-handler.middleware";
import { env } from "./config/env";

export const setupApp = async (db: Database): Promise<Express> => {
    const app = express();

    app.use(express.json());

    if (env.NODE_ENV === "development") {
        app.use((req, _res, next) => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] ${req.method} ${req.path}`);
            next();
        });
    }

    if (env.NODE_ENV === "production") {
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 1000,
            standardHeaders: true,
            legacyHeaders: false,
            message: "Too many requests from this IP, please try again later",
        });

        app.use(limiter);
    }

    // Dependency injection
    const candidatesRepository = new CandidatesRepository(db);
    const legacyApiService = new LegacyApiService();
    const candidatesService = new CandidatesService(
        candidatesRepository,
        legacyApiService
    );
    const candidatesController = new CandidatesController(candidatesService);

    app.get("/", (_req, res) => {
        res.json({ message: "MasterBorn - Recruitment Task" });
    });

    app.get("/health", (_req, res) => {
        res.json({ status: "ok", version: "1.0.0" });
    });

    app.use("/v1", candidatesController.router);
    app.use(errorHandler);

    return app;
};
