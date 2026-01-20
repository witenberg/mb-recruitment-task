import { open } from "sqlite";
import sqlite3 from "sqlite3";
import path from "path";

export const setupDb = async () => {
    const db = await open({
        filename: "./recruitment.db",
        driver: sqlite3.Database,
    });

    await db.migrate({
        migrationsPath: path.join(__dirname, '..', 'migrations')
    });

    return db;
}