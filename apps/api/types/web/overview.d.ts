import type { AuthEnv } from '../auth';
import type { Db } from '../db';
/** Overview dashboard and module lists for the web app (ADR-0049), computed from the same projections as the reports. */
export declare function webOverviewRoutes(db: Db): import("hono/hono-base").HonoBase<AuthEnv, {
    "/overview": {
        $get: {
            output: {
                kpis: {
                    label: {
                        id: string;
                        en: string;
                    };
                    value: string;
                    delta: string;
                    cols: number[];
                    to: string;
                }[];
                cards: {
                    id: string;
                    title: {
                        id: string;
                        en: string;
                    };
                    text: {
                        id: string;
                        en: string;
                    };
                    bg: string;
                    record: {
                        kind: {
                            id: string;
                            en: string;
                        };
                        title: string;
                        value: string;
                        note: {
                            id: string;
                            en: string;
                        };
                        lines: {
                            a: {
                                id: string;
                                en: string;
                            };
                            b: string;
                        }[];
                        cta: {
                            id: string;
                            en: string;
                        };
                    };
                }[];
                lowTabs: {
                    name: {
                        id: string;
                        en: string;
                    };
                    count?: number | undefined;
                }[];
                groups: {
                    title: {
                        id: string;
                        en: string;
                    };
                    sub: {
                        id: string;
                        en: string;
                    };
                    to?: string | undefined;
                    tiles: {
                        label: {
                            id: string;
                            en: string;
                        };
                        v: string;
                        d: string;
                        bars: number[];
                        to?: string | undefined;
                        feature?: string | undefined;
                        off?: {
                            id: string;
                            en: string;
                        } | undefined;
                    }[];
                }[];
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {};
        };
    };
} & {
    "/modules/:module{customers|vendors|items|taxes}": {
        $get: {
            output: {
                id: string;
                name: string;
                contact: string;
                bal: string;
                status: "active" | "inactive" | "overdue";
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
            input: {
                param: {
                    module: string;
                };
            };
        };
    };
}, "/", "/modules/:module{customers|vendors|items|taxes}">;
