import postgres from 'postgres';
export declare function connect(url?: string | undefined, opts?: postgres.Options<{}>): {
    client: postgres.Sql<{}>;
    db: import("drizzle-orm/postgres-js").PostgresJsDatabase<Record<string, never>> & {
        $client: postgres.Sql<{}>;
    };
};
export type Db = ReturnType<typeof connect>['db'];
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
/** Applies migrations in name order, once each. Hand-written SQL because triggers and deferred constraints are the point. */
export declare function migrate(client: postgres.Sql): Promise<void>;
