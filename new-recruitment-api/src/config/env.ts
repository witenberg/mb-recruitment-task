import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LEGACY_API_URL: z.url(),
    LEGACY_API_KEY: z.string().min(1),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

function validateEnv(): z.infer<typeof envSchema> {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error("Invalid environment variables:");
        console.error(result.error.format());
        throw new Error("Environment validation failed");
    }

    return result.data;
}

export const env = validateEnv();
