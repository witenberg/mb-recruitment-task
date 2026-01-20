import { z } from "zod";
import { RecruitmentStatus } from "../types/candidate";

const emailSchema = z
    .email("Invalid email format")
    .max(255, "Email cannot exceed 255 characters")
    .toLowerCase()
    .trim();

const recruitmentStatusSchema = z.nativeEnum(RecruitmentStatus);

const dateSchema = z.iso.datetime({
    message: "Invalid date format. Expected ISO 8601 datetime string"
});

const jobOfferIdsSchema = z
    .array(z.number().int().positive("Job offer ID must be a positive integer"))
    .min(1, "At least one job offer is required")
    .max(50, "Cannot assign more than 50 job offers");

const yearsOfExperienceSchema = z
    .number()
    .int()
    .min(0, "Years of experience cannot be negative")
    .max(70, "Years of experience cannot exceed 70");

const phoneSchema = z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional();

const recruiterNotesSchema = z
    .string()
    .max(5000, "Recruiter notes cannot exceed 5000 characters")
    .optional();

export const createCandidateSchema = z
    .object({
        firstName: z.string().min(1, "First name is required").max(100).trim(),
        lastName: z.string().min(1, "Last name is required").max(100).trim(),
        email: emailSchema,
        phone: phoneSchema,
        yearsOfExperience: yearsOfExperienceSchema,
        recruiterNotes: recruiterNotesSchema,
        status: recruitmentStatusSchema,
        consentDate: dateSchema,
        jobOfferIds: jobOfferIdsSchema,
    })
    .strict();

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;

export function validateCreateCandidate(data: unknown): CreateCandidateInput {
    return createCandidateSchema.parse(data);
}

export const paginationQuerySchema = z.object({
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .default(10)
        .transform((val) => Math.min(val, 100)),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function validatePaginationQuery(query: unknown): PaginationQuery {
    return paginationQuerySchema.parse(query);
}
