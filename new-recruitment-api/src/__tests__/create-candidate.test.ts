import { Application } from "express";
import { Database } from "sqlite";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import path from "path";
import request from "supertest";
import { setupApp } from "../app";
import { RecruitmentStatus } from "../types/candidate";

jest.mock("../services/legacy-api.service", () => {
    class LegacyApiError extends Error {
        constructor(message: string, public statusCode: number, public response?: unknown) {
            super(message);
            this.name = "LegacyApiError";
        }
    }

    return {
        LegacyApiService: jest.fn().mockImplementation(() => ({
            sendCandidate: jest.fn().mockResolvedValue(undefined),
        })),
        LegacyApiError,
    };
});

jest.mock("../config/env", () => ({
    env: {
        PORT: 3000,
        LEGACY_API_URL: "http://localhost:4040",
        LEGACY_API_KEY: "test-key",
        NODE_ENV: "test",
    },
}));

describe("Candidates API", () => {
    let app: Application;
    let db: Database;

    beforeAll(async () => {
        db = await open({
            filename: ":memory:",
            driver: sqlite3.Database,
        });

        await db.migrate({
            migrationsPath: path.join(__dirname, "../../migrations"),
        });

        await db.run(
            `INSERT INTO JobOffer (title, description, salary_range, location)
             VALUES (?, ?, ?, ?)`,
            ["Software Engineer", "Test job offer", "$50,000 - $70,000", "New York"]
        );

        app = await setupApp(db);
    });

    afterAll(async () => {
        await db.close();
    });

    it("should create a new candidate successfully", async () => {
        const candidateData = {
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            phone: "+48123456789",
            yearsOfExperience: 5,
            recruiterNotes: "Great candidate",
            status: RecruitmentStatus.NEW,
            consentDate: new Date().toISOString(),
            jobOfferIds: [1],
        };

        const response = await request(app)
            .post("/v1/candidates")
            .send(candidateData)
            .expect(201);

        expect(response.body).toHaveProperty("message");
        expect(response.body).toHaveProperty("id");
        expect(response.body.message).toBe("Candidate created successfully");
        expect(typeof response.body.id).toBe("number");

        const candidate = await db.get(
            `SELECT 
                c.id,
                c.first_name,
                c.last_name,
                c.email,
                c.phone,
                c.years_of_experience,
                c.recruiter_notes,
                c.status,
                c.consent_date,
                GROUP_CONCAT(cjo.job_offer_id) as job_offer_ids
            FROM Candidate c
            LEFT JOIN CandidateJobOffer cjo ON c.id = cjo.candidate_id
            WHERE c.id = ?
            GROUP BY c.id`,
            [response.body.id]
        );

        expect(candidate).toBeDefined();
        expect(candidate?.first_name).toBe(candidateData.firstName);
        expect(candidate?.last_name).toBe(candidateData.lastName);
        expect(candidate?.email).toBe(candidateData.email);
        expect(candidate?.phone).toBe(candidateData.phone);
        expect(candidate?.years_of_experience).toBe(candidateData.yearsOfExperience);
        expect(candidate?.recruiter_notes).toBe(candidateData.recruiterNotes);
        expect(candidate?.status).toBe(candidateData.status);
        expect(candidate?.job_offer_ids).toBe("1");
    });

    it("should create a candidate with multiple job offers", async () => {
        await db.run(
            `INSERT INTO JobOffer (title, description, salary_range, location)
             VALUES (?, ?, ?, ?)`,
            ["Backend Engineer", "Test job 2", "$60,000 - $80,000", "Remote"]
        );

        const candidateData = {
            firstName: "Jane",
            lastName: "Smith",
            email: "jane.smith@example.com",
            phone: "+48987654321",
            yearsOfExperience: 3,
            recruiterNotes: "Excellent skills",
            status: RecruitmentStatus.IN_PROGRESS,
            consentDate: new Date().toISOString(),
            jobOfferIds: [1, 2],
        };

        const response = await request(app)
            .post("/v1/candidates")
            .send(candidateData)
            .expect(201);

        expect(response.body.id).toBeDefined();

        const candidate = await db.get(
            `SELECT GROUP_CONCAT(cjo.job_offer_id) as job_offer_ids
            FROM CandidateJobOffer cjo
            WHERE cjo.candidate_id = ?`,
            [response.body.id]
        );

        expect(candidate?.job_offer_ids).toBe("1,2");
    });

    it("should return 400 for invalid email", async () => {
        const candidateData = {
            firstName: "Test",
            lastName: "User",
            email: "invalid-email",
            yearsOfExperience: 2,
            status: RecruitmentStatus.NEW,
            consentDate: new Date().toISOString(),
            jobOfferIds: [1],
        };

        const response = await request(app)
            .post("/v1/candidates")
            .send(candidateData)
            .expect(400);

        expect(response.body.error).toBe("Validation failed");
    });

    it("should return 404 for non-existent job offer", async () => {
        const candidateData = {
            firstName: "Test",
            lastName: "User",
            email: "test@example.com",
            yearsOfExperience: 2,
            status: RecruitmentStatus.NEW,
            consentDate: new Date().toISOString(),
            jobOfferIds: [999],
        };

        const response = await request(app)
            .post("/v1/candidates")
            .send(candidateData)
            .expect(404);

        expect(response.body.error).toContain("Job offer");
    });

    it("should return 409 for duplicate email", async () => {
        const candidateData = {
            firstName: "Duplicate",
            lastName: "Test",
            email: "unique-test-email-" + Date.now() + "@example.com",
            yearsOfExperience: 1,
            status: RecruitmentStatus.NEW,
            consentDate: new Date().toISOString(),
            jobOfferIds: [1],
        };

        const firstResponse = await request(app).post("/v1/candidates").send(candidateData);
        expect(firstResponse.status).toBe(201);

        const response = await request(app).post("/v1/candidates").send(candidateData);

        expect(response.status).toBe(409);
        expect(response.body.error).toContain("email already exists");
    });

    describe("Pagination", () => {
        beforeAll(async () => {
            for (let i = 0; i < 25; i++) {
                await db.run(
                    `INSERT INTO Candidate (first_name, last_name, email, phone, years_of_experience, recruiter_notes, status, consent_date)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        `First${i}`,
                        `Last${i}`,
                        `user${i}@test.com`,
                        `+4812345${i.toString().padStart(4, "0")}`,
                        i % 10,
                        `Notes ${i}`,
                        RecruitmentStatus.NEW,
                        new Date().toISOString(),
                    ]
                );

                const result = await db.get(`SELECT last_insert_rowid() as id`);
                await db.run(
                    `INSERT INTO CandidateJobOffer (candidate_id, job_offer_id) VALUES (?, ?)`,
                    [(result as { id: number }).id, 1]
                );
            }
        });

        it("should return paginated candidates", async () => {
            const response = await request(app).get("/v1/candidates?page=1&limit=10").expect(200);

            expect(response.body.data).toHaveLength(10);
            expect(response.body.pagination).toEqual({
                page: 1,
                limit: 10,
                total: expect.any(Number),
                totalPages: expect.any(Number),
            });
        });

        it("should return second page of candidates", async () => {
            const response = await request(app).get("/v1/candidates?page=2&limit=10").expect(200);

            expect(response.body.data).toHaveLength(10);
            expect(response.body.pagination.page).toBe(2);
        });

        it("should use default pagination values", async () => {
            const response = await request(app).get("/v1/candidates").expect(200);

            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(10);
        });

        it("should enforce maximum limit", async () => {
            const response = await request(app).get("/v1/candidates?limit=200").expect(200);

            expect(response.body.pagination.limit).toBe(100);
        });
    });
});
