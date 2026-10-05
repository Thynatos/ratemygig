// In-memory stand-in for the slice of supabase-js that SyncService uses.
// It enforces the constraints of 001_initial_schema.sql and reproduces the
// Postgres/PostgREST behaviour the batching relies on, so tests fail the way
// production would instead of passing against a forgiving fake.

import type { SupabaseClient } from '@supabase/supabase-js';

export type Row = Record<string, unknown>;

export interface RecordedCall {
    table: string;
    op: 'select' | 'insert' | 'update' | 'upsert';
    rows: Row[];
    columns: string[];
    onConflict?: string;
    ignoreDuplicates?: boolean;
    returning?: string;
}

interface TableSpec {
    primaryKey: string[];
    notNull: string[];
    unique: string[][];
    defaults: Row;
    hasId: boolean;
}

const TABLES: Record<string, TableSpec> = {
    venues: {
        primaryKey: ['id'],
        notNull: ['name', 'city', 'country'],
        unique: [['id'], ['name', 'city', 'country']],
        defaults: { lat: null, lng: null, provider_venue_id: null },
        hasId: true,
    },
    artists: {
        primaryKey: ['id'],
        notNull: ['name'],
        unique: [['id'], ['name']],
        defaults: { provider_artist_id: null, image_url: null },
        hasId: true,
    },
    events: {
        primaryKey: ['id'],
        notNull: ['provider', 'provider_event_id', 'name', 'start_at', 'city', 'country', 'ticket_urls', 'lineup'],
        unique: [['id'], ['provider', 'provider_event_id']],
        defaults: { venue_id: null, ticket_urls: [], lineup: [], image_url: null },
        hasId: true,
    },
    event_artists: {
        primaryKey: ['event_id', 'artist_id'],
        notNull: ['event_id', 'artist_id'],
        unique: [['event_id', 'artist_id']],
        defaults: { billing_order: null },
        hasId: false,
    },
};

export class FakePostgrestError extends Error {
    code: string;

    constructor(message: string, code: string) {
        super(message);
        this.name = 'PostgrestError';
        this.code = code;
    }
}

export interface QueryState {
    table: string;
    op: RecordedCall['op'] | null;
    payload: Row[];
    columns: string[];
    options: { onConflict?: string; ignoreDuplicates?: boolean };
    filters: [string, unknown][];
    returning: string | null;
    single: boolean;
    throwOnError: boolean;
}

export interface FakeResult {
    data: unknown;
    error: { message: string; code: string; details: null; hint: null } | null;
}

function keyOf(row: Row, columns: string[]): string | null {
    const values = columns.map(column => row[column]);
    return values.some(value => value === null || value === undefined) ? null : JSON.stringify(values);
}

function sameColumns(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every(column => b.includes(column));
}

function project(row: Row, columns: string | null): Row {
    if (columns === null || columns === '*') {
        return structuredClone(row);
    }
    const picked: Row = {};
    for (const column of columns.split(',').map(name => name.trim())) {
        picked[column] = structuredClone(row[column]);
    }
    return picked;
}

function wire(rows: Row[]): Row[] {
    return JSON.parse(JSON.stringify(rows)) as Row[];
}

export class FakeQuery implements PromiseLike<FakeResult> {
    private db: FakeSupabase;
    private state: QueryState;

    constructor(db: FakeSupabase, table: string) {
        this.db = db;
        this.state = {
            table,
            op: null,
            payload: [],
            columns: [],
            options: {},
            filters: [],
            returning: null,
            single: false,
            throwOnError: false,
        };
    }

    select(columns: string = '*'): this {
        if (this.state.op === null) {
            this.state.op = 'select';
        }
        this.state.returning = columns;
        return this;
    }

    insert(payload: Row | Row[]): this {
        return this.write('insert', payload);
    }

    update(patch: Row): this {
        return this.write('update', patch);
    }

    upsert(payload: Row | Row[], options: { onConflict?: string; ignoreDuplicates?: boolean } = {}): this {
        this.state.options = options;
        return this.write('upsert', payload);
    }

    eq(column: string, value: unknown): this {
        this.state.filters.push([column, value]);
        return this;
    }

    single(): this {
        this.state.single = true;
        return this;
    }

    throwOnError(): this {
        this.state.throwOnError = true;
        return this;
    }

    then<TResult1 = FakeResult, TResult2 = never>(
        onfulfilled?: ((value: FakeResult) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): PromiseLike<TResult1 | TResult2> {
        return Promise.resolve()
            .then(() => this.db.execute(this.state))
            .then(onfulfilled, onrejected);
    }

    // supabase-js derives the column list from the keys of the rows it is given
    // (their union for an array) and serialises the rows to JSON, which drops
    // undefined values; both are mirrored here.
    private write(op: 'insert' | 'update' | 'upsert', payload: Row | Row[]): this {
        const rows = Array.isArray(payload) ? payload : [payload];
        this.state.op = op;
        this.state.columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
        this.state.payload = wire(rows);
        return this;
    }
}

export class FakeSupabase {
    readonly calls: RecordedCall[] = [];
    readonly insertTriggerFires: Record<string, number> = {};

    private tables: Record<string, Row[]> = {};
    private failures: { matches: (call: RecordedCall) => boolean; message: string }[] = [];
    private clock = 0;
    private nextId = 0;

    constructor() {
        for (const table of Object.keys(TABLES)) {
            this.tables[table] = [];
            this.insertTriggerFires[table] = 0;
        }
    }

    client(): SupabaseClient {
        return this as unknown as SupabaseClient;
    }

    from(table: string): FakeQuery {
        if (!TABLES[table]) {
            throw new Error(`FakeSupabase has no table "${table}"`);
        }
        return new FakeQuery(this, table);
    }

    rows(table: string): Row[] {
        return structuredClone(this.tables[table]);
    }

    resetCalls(): void {
        this.calls.length = 0;
    }

    failWhen(matches: (call: RecordedCall) => boolean, message: string = 'injected failure'): void {
        this.failures.push({ matches, message });
    }

    clearFailures(): void {
        this.failures = [];
    }

    execute(state: QueryState): FakeResult {
        const op = state.op ?? 'select';
        const call: RecordedCall = {
            table: state.table,
            op,
            rows: structuredClone(state.payload),
            columns: state.columns,
            onConflict: state.options.onConflict,
            ignoreDuplicates: state.options.ignoreDuplicates,
            returning: state.returning ?? undefined,
        };
        this.calls.push(call);

        try {
            const failure = this.failures.find(candidate => candidate.matches(call));
            if (failure) {
                throw new FakePostgrestError(failure.message, 'XX000');
            }
            return { data: this.apply(state, op), error: null };
        } catch (error) {
            if (!(error instanceof FakePostgrestError)) {
                throw error;
            }
            if (state.throwOnError) {
                throw error;
            }
            return { data: null, error: { message: error.message, code: error.code, details: null, hint: null } };
        }
    }

    private apply(state: QueryState, op: RecordedCall['op']): unknown {
        const spec = TABLES[state.table];

        if (op === 'select') {
            const matched = this.tables[state.table].filter(row => this.matches(row, state));
            return this.shape(matched.map(row => project(row, state.returning)), state);
        }

        // A statement is atomic: work on a copy and keep it only if nothing fails
        const staged = this.tables[state.table].map(row => ({ ...row }));
        const result = { returned: [] as Row[], inserted: 0 };

        if (op === 'insert') {
            for (const incoming of state.payload) {
                const proposed = this.proposedRow(state, spec, incoming);
                this.assertUnique(spec, staged, proposed);
                this.insertRow(state.table, staged, proposed, result);
            }
        } else if (op === 'update') {
            for (const row of staged.filter(candidate => this.matches(candidate, state))) {
                this.updateRow(state.table, row, state.payload[0]);
                result.returned.push(row);
            }
        } else {
            this.upsert(state, spec, staged, result);
        }

        const data = state.returning === null
            ? null
            : this.shape(result.returned.map(row => project(row, state.returning)), state);

        this.tables[state.table] = staged;
        this.insertTriggerFires[state.table] += result.inserted;
        return data;
    }

    private upsert(
        state: QueryState,
        spec: TableSpec,
        staged: Row[],
        result: { returned: Row[]; inserted: number }
    ): void {
        const target = state.options.onConflict
            ? state.options.onConflict.split(',').map(column => column.trim())
            : spec.primaryKey;

        if (!spec.unique.some(columns => sameColumns(columns, target))) {
            throw new FakePostgrestError(
                'there is no unique or exclusion constraint matching the ON CONFLICT specification',
                '42P10'
            );
        }

        const touched = new Set<string>();

        for (const incoming of state.payload) {
            const proposed = this.proposedRow(state, spec, incoming);
            const key = keyOf(proposed, target);
            const existing = key === null ? undefined : staged.find(row => keyOf(row, target) === key);

            if (existing && key !== null) {
                if (state.options.ignoreDuplicates) {
                    continue;
                }
                if (touched.has(key)) {
                    throw new FakePostgrestError(
                        'ON CONFLICT DO UPDATE command cannot affect row a second time',
                        '21000'
                    );
                }
                const patch: Row = {};
                for (const column of state.columns) {
                    patch[column] = proposed[column];
                }
                this.updateRow(state.table, existing, patch);
                touched.add(key);
                result.returned.push(existing);
                continue;
            }

            this.assertUnique(spec, staged, proposed);
            this.insertRow(state.table, staged, proposed, result);
            if (key !== null) {
                touched.add(key);
            }
        }
    }

    // Columns missing from the statement take their default; columns that are in
    // the statement but missing from this row become NULL. NOT NULL is checked on
    // the proposed row, before any conflict is looked at.
    private proposedRow(state: QueryState, spec: TableSpec, incoming: Row): Row {
        const row: Row = structuredClone(spec.defaults);
        for (const column of state.columns) {
            row[column] = incoming[column] === undefined ? null : incoming[column];
        }
        for (const column of spec.notNull) {
            if (row[column] === null || row[column] === undefined) {
                throw new FakePostgrestError(
                    `null value in column "${column}" of relation "${state.table}" violates not-null constraint`,
                    '23502'
                );
            }
        }
        return row;
    }

    private assertUnique(spec: TableSpec, staged: Row[], proposed: Row): void {
        for (const columns of spec.unique) {
            const key = keyOf(proposed, columns);
            if (key !== null && staged.some(row => keyOf(row, columns) === key)) {
                throw new FakePostgrestError(
                    `duplicate key value violates unique constraint on (${columns.join(', ')})`,
                    '23505'
                );
            }
        }
    }

    // AFTER INSERT triggers (migration 013) fire once per row that is really inserted
    private insertRow(
        table: string,
        staged: Row[],
        proposed: Row,
        result: { returned: Row[]; inserted: number }
    ): void {
        const stamp = this.tick();
        const row: Row = { ...proposed };
        if (TABLES[table].hasId) {
            row.id = `${table}-${++this.nextId}`;
            row.created_at = stamp;
        }
        if (table === 'events') {
            row.updated_at = stamp;
        }
        staged.push(row);
        result.returned.push(row);
        result.inserted++;
    }

    // BEFORE UPDATE trigger on events keeps updated_at current
    private updateRow(table: string, row: Row, patch: Row): void {
        Object.assign(row, patch);
        if (table === 'events') {
            row.updated_at = this.tick();
        }
    }

    private matches(row: Row, state: QueryState): boolean {
        return state.filters.every(([column, value]) => row[column] === value);
    }

    private shape(rows: Row[], state: QueryState): unknown {
        if (!state.single) {
            return rows;
        }
        if (rows.length !== 1) {
            throw new FakePostgrestError('JSON object requested, multiple (or no) rows returned', 'PGRST116');
        }
        return rows[0];
    }

    private tick(): string {
        return new Date(Date.UTC(2026, 0, 1, 0, 0, ++this.clock)).toISOString();
    }
}
