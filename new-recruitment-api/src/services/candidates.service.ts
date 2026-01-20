import { CandidatesRepository } from "../repositories/candidates.repository";
import { LegacyApiService } from "./legacy-api.service";
import { Candidate, CreateCandidateDto } from "../types/candidate";

export class CandidateNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CandidateNotFoundError";
    }
}

export class JobOfferNotFoundError extends Error {
    constructor(jobOfferIds: number[]) {
        super(`Job offer(s) with ID(s) ${jobOfferIds.join(", ")} do not exist`);
        this.name = "JobOfferNotFoundError";
    }
}

export class CandidatesService {
    constructor(
        private candidatesRepository: CandidatesRepository,
        private legacyApiService: LegacyApiService
    ) { }

    async createCandidate(data: CreateCandidateDto): Promise<number> {
        const existingJobOffers = await this.candidatesRepository.jobOfferExist(
            data.jobOfferIds
        );

        const missingJobOffers = data.jobOfferIds.filter(
            (id) => !existingJobOffers.includes(id)
        );

        if (missingJobOffers.length > 0) {
            throw new JobOfferNotFoundError(missingJobOffers);
        }

        await this.legacyApiService.sendCandidate(data);

        const candidateId = await this.candidatesRepository.create(data);

        return candidateId;
    }

    async getCandidates(
        page: number = 1,
        limit: number = 10
    ): Promise<{
        candidates: Candidate[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        const validPage = Math.max(1, page);
        const validLimit = Math.max(1, Math.min(100, limit));
        const offset = (validPage - 1) * validLimit;

        const [candidates, total] = await Promise.all([
            this.candidatesRepository.findAll(validLimit, offset),
            this.candidatesRepository.count(),
        ]);

        return {
            candidates,
            pagination: {
                page: validPage,
                limit: validLimit,
                total,
                totalPages: Math.ceil(total / validLimit),
            },
        };
    }
}
