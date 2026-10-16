import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/** All games ordered by title. */
export async function getAllGames(db: Database): Promise<Game[]> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}

/** Optional criteria for {@link getGames}. */
export interface GameFilters {
    /** Match games in any of these categories. An empty or omitted list means no category filter. */
    categoryIds?: number[];
    /** Match games from this publisher. `null` or omitted means no publisher filter. */
    publisherId?: number | null;
}

/** A category or publisher option usable in filter controls. */
export interface FilterOption {
    /** Row id. */
    id: number;
    /** Display name. */
    name: string;
}

/**
 * Games ordered by title, optionally filtered by category and publisher.
 * Category and publisher filters combine with AND.
 *
 * @param db - Database connection.
 * @param filters - Optional category/publisher criteria.
 * @returns Matching games ordered by title.
 */
export async function getGames(db: Database, filters: GameFilters = {}): Promise<Game[]> {
    const conditions = [];
    if (filters.categoryIds && filters.categoryIds.length > 0) {
        conditions.push(inArray(games.categoryId, filters.categoryIds));
    }
    if (filters.publisherId !== undefined && filters.publisherId !== null) {
        conditions.push(eq(games.publisherId, filters.publisherId));
    }
    const rows = await baseGamesQuery(db)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * All categories ordered by name.
 *
 * @param db - Database connection.
 * @returns Categories as filter options.
 */
export async function getAllCategories(db: Database): Promise<FilterOption[]> {
    return db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));
}

/**
 * All publishers ordered by name.
 *
 * @param db - Database connection.
 * @returns Publishers as filter options.
 */
export async function getAllPublishers(db: Database): Promise<FilterOption[]> {
    return db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));
}
