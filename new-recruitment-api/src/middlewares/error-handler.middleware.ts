import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { LegacyApiError } from "../services/legacy-api.service";
import { JobOfferNotFoundError } from "../services/candidates.service";

export const errorHandler = (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    if (res.headersSent) {
        return;
    }

    if (error instanceof ZodError) {
        res.status(400).json({
            error: "Validation failed",
            details: error.issues,
        });
        return;
    }

    if (error instanceof JobOfferNotFoundError) {
        res.status(404).json({
            error: error.message,
        });
        return;
    }

    if (error instanceof LegacyApiError) {
        const statusCode = error.statusCode === 504 ? 502 : error.statusCode || 502;
        res.status(statusCode).json({
            error: "Legacy API error",
            message: error.message,
            details: error.response,
        });
        return;
    }

    // SQLITE constraint errors
    const err = error as any;
    const errString = String(err).toLowerCase();
    const isConstraintError =
        err.code === "SQLITE_CONSTRAINT" ||
        err.code === "SQLITE_CONSTRAINT_UNIQUE" ||
        err.errno === 19 ||
        err.errno === 2067 ||
        errString.includes("unique constraint") ||
        errString.includes("constraint failed");

    if (isConstraintError) {
        res.status(409).json({
            error: "Candidate with this email already exists",
        });
        return;
    }

    // unexpected errors
    console.error("Unexpected error:", error);
    res.status(500).json({
        error: "Internal server error",
    });
};
