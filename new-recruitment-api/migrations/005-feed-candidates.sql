INSERT INTO Candidate (first_name, last_name, email, phone, years_of_experience, recruiter_notes, status, consent_date)
VALUES
    ('Jan', 'Kowalski', 'jan.kowalski@example.com', '501-234-567', 3, 'Highly motivated candidate with great teamwork approach.', 'new', '2026-01-15 10:30:00'),
    ('Maria', 'Nowak', 'maria.nowak@example.com', '502-345-678', 5, 'Enterprise project experience. Recommended by the team.', 'in_progress', '2026-01-20 14:15:00'),
    ('Tomasz', 'Wiśniewski', 'tomasz.wisniewski@example.com', '503-456-789', 2, 'Young but very talented programmer. Worth considering.', 'new', '2026-02-01 09:00:00'),
    ('Anna', 'Wójcik', 'anna.wojcik@example.com', '504-567-890', 7, 'Senior developer with extensive experience. Excellent references.', 'accepted', '2026-01-10 11:20:00'),
    ('Piotr', 'Kowalczyk', 'piotr.kowalczyk@example.com', '505-678-901', 1, 'Beginner but shows great potential. Requires training.', 'in_progress', '2026-02-05 16:45:00'),
    ('Katarzyna', 'Zielińska', 'katarzyna.zielinska@example.com', '506-789-012', 4, 'Frontend specialist. React and Vue.js expertise.', 'new', '2026-02-10 13:30:00'),
    ('Michał', 'Szymański', 'michal.szymanski@example.com', '507-890-123', 6, 'Backend developer with Node.js and Python experience.', 'accepted', '2026-01-25 10:00:00'),
    ('Agnieszka', 'Woźniak', 'agnieszka.wozniak@example.com', '508-901-234', 3, 'Full-stack developer. Strong TypeScript knowledge.', 'rejected', '2026-01-18 15:20:00'),
    ('Paweł', 'Kozłowski', 'pawel.kozlowski@example.com', '509-012-345', 8, 'Systems architect. Large-scale project experience.', 'in_progress', '2026-01-12 12:00:00'),
    ('Magdalena', 'Jankowska', 'magdalena.jankowska@example.com', '510-123-456', 2, 'Junior developer. Eager to learn and grow.', 'new', '2026-02-15 09:15:00');

INSERT INTO CandidateJobOffer (candidate_id, job_offer_id)
VALUES
    (1, 1),
    (1, 6),
    (2, 2),
    (3, 1),
    (4, 5),
    (4, 14),
    (5, 1),
    (6, 4),
    (6, 8),
    (7, 5),
    (8, 6),
    (9, 15),
    (10, 1);
