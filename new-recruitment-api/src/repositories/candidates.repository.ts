import { Database } from "sqlite";
import { Candidate, CreateCandidateDto, RecruitmentStatus } from "../types/candidate";

interface DbRow {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    years_of_experience: number;
    recruiter_notes: string | null;
    status: string;
    consent_date: string;
    created_at: string;
    job_offer_ids: string | null;
}

interface CountRow {
    count: number;
}

export class CandidatesRepository {
    constructor(private db: Database) { }

    async create(candidate: CreateCandidateDto): Promise<number> {
        try {
            await this.db.exec("BEGIN IMMEDIATE");

            const result = await this.db.run(
                `INSERT INTO Candidate (
                    first_name, 
                    last_name, 
                    email, 
                    phone, 
                    years_of_experience, 
                    recruiter_notes, 
                    status, 
                    consent_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    candidate.firstName,
                    candidate.lastName,
                    candidate.email,
                    candidate.phone ?? null,
                    candidate.yearsOfExperience,
                    candidate.recruiterNotes ?? null,
                    candidate.status,
                    candidate.consentDate,
                ]
            );

            const candidateId = result.lastID;
            if (!candidateId) {
                throw new Error("Failed to get candidate ID");
            }

            for (const jobOfferId of candidate.jobOfferIds) {
                await this.db.run(
                    `INSERT INTO CandidateJobOffer (candidate_id, job_offer_id) VALUES (?, ?)`,
                    [candidateId, jobOfferId]
                );
            }

            await this.db.exec("COMMIT");
            return candidateId;
        } catch (error) {
            await this.db.exec("ROLLBACK").catch(() => { });
            throw error;
        }
    }

    async findAll(limit: number, offset: number): Promise<Candidate[]> {
        const rows = await this.db.all<DbRow[]>(
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
                c.created_at,
                GROUP_CONCAT(cjo.job_offer_id) as job_offer_ids
            FROM Candidate c
            LEFT JOIN CandidateJobOffer cjo ON c.id = cjo.candidate_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        return rows.map((row) => this.mapRowToCandidate(row));
    }

    async findByEmail(email: string): Promise<Candidate | null> {
        const row = await this.db.get<DbRow>(
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
                c.created_at,
                GROUP_CONCAT(cjo.job_offer_id) as job_offer_ids
            FROM Candidate c
            LEFT JOIN CandidateJobOffer cjo ON c.id = cjo.candidate_id
            WHERE c.email = ?
            GROUP BY c.id`,
            [email]
        );

        return row ? this.mapRowToCandidate(row) : null;
    }

    async count(): Promise<number> {
        const row = await this.db.get<CountRow>(`SELECT COUNT(*) as count FROM Candidate`);
        return row?.count ?? 0;
    }

    async jobOfferExist(jobOfferIds: number[]): Promise<number[]> {
        if (jobOfferIds.length === 0) {
            return [];
        }

        const placeholders = jobOfferIds.map(() => "?").join(",");
        const rows = await this.db.all<{ id: number }[]>(
            `SELECT id FROM JobOffer WHERE id IN (${placeholders})`,
            jobOfferIds
        );

        return rows.map((row) => row.id);
    }

    private mapRowToCandidate(row: DbRow): Candidate {
        const jobOfferIds: number[] = row.job_offer_ids
            ? row.job_offer_ids
                .split(",")
                .map((id) => parseInt(id.trim(), 10))
                .filter((id) => !isNaN(id))
            : [];

        return {
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            phone: row.phone,
            yearsOfExperience: row.years_of_experience,
            recruiterNotes: row.recruiter_notes,
            status: row.status as RecruitmentStatus,
            consentDate: row.consent_date,
            jobOfferIds,
            createdAt: row.created_at,
        };
    }
}
