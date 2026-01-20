export enum RecruitmentStatus {
    NEW = "new",
    IN_PROGRESS = "in_progress",
    ACCEPTED = "accepted",
    REJECTED = "rejected"
}

export interface Candidate {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    yearsOfExperience: number;
    recruiterNotes: string | null;
    status: RecruitmentStatus;
    consentDate: string; // ISO date string
    jobOfferIds: number[]; // array of job offer ids (candidate can have multiple offers)
    createdAt?: string;
}

export interface CreateCandidateDto {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    yearsOfExperience: number;
    recruiterNotes?: string;
    status: RecruitmentStatus;
    consentDate: string;
    jobOfferIds: number[];
}
