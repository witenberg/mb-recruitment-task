import { Request, Response, Router, NextFunction } from "express";
import { CandidatesService } from "../services/candidates.service";
import { validateCreateCandidate, validatePaginationQuery } from "../utils/validators";

export class CandidatesController {
    readonly router = Router();

    constructor(private candidatesService: CandidatesService) {
        this.router.get("/candidates", this.getAll.bind(this));
        this.router.post("/candidates", this.create.bind(this));
    }

    async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { page, limit } = validatePaginationQuery(req.query);
            const result = await this.candidatesService.getCandidates(page, limit);

            res.json({
                data: result.candidates,
                pagination: result.pagination,
            });
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = validateCreateCandidate(req.body);
            const candidateId = await this.candidatesService.createCandidate(validatedData);

            res.status(201).json({
                message: "Candidate created successfully",
                id: candidateId,
            });
        } catch (error) {
            next(error);
        }
    }
}
