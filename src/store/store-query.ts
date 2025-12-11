import { Flatten, KeyOf, MaybeArray, isObject, omit } from "src/typing.utils";
import { ErrorCodeException } from "src/utils";

/** Defaults to "AND" */
export type Operation = "AND" | "OR" | "NOT" | undefined;

export type HigherClause<T, OP extends Operation> =
	(HigherClause<T, Operation> | LiteralMapClause<T, Operation>)[]
	& { operation?: OP };

export const isHigherClause = <T>(
	clause: Omit<HigherClause<T, Operation> | LiteralMapClause<T, Operation>, "operation">
): clause is HigherClause<T, Operation> =>
		Array.isArray(clause);

export type Literal = string | boolean | number;

// We use a class getter to be sure that the singleton instance operation 'exists' cannot be modified even in theory.
export class ExistsClause {
	get operation() { return "EXISTS" as const; }
}

export const exists = new ExistsClause;

export const isExistsClause = (literal: unknown)
	: literal is ExistsClause => isObject(literal) && literal.operation === "EXISTS";

export class RangeClause {
	value: string;
	constructor(from: string, to: string) {
		this.value =  `[${from} TO ${to}]`;
	}
	get operation() { return "RANGE" as const; }
}

export const range = (from: string, to: string) => new RangeClause(from, to);

export const isRangeClause = (literal: unknown)
	: literal is RangeClause => isObject(literal) && literal.operation === "RANGE";

export type LiteralMapClause< T, OP extends Operation> = Partial<{[prop in KeyOf<T>]:
	MaybeArray<Flatten<T[prop]> & Literal>
	| ExistsClause
	| RangeClause
}> & { operation?: OP };

export const isLiteralsClause = (
	clause: MaybeArray<Literal>
	| HigherClause<never, never>
	| LiteralMapClause<never, never>
	| ExistsClause
	| RangeClause
): clause is MaybeArray<Literal> => {
	if (!Array.isArray(clause)) {
		return false;
	}
	if (!clause.length) {
		throw new Error("Can't interpret whether is an literals or higher clause. Please fix your query.");
	}
	return ["string", "boolean", "number"].includes(typeof clause[0]);
};

export const isLiteralMapClause = <T>(
	clause: LiteralMapClause<T, Operation>
	| HigherClause<T, Operation>
	| MaybeArray<Literal>
	| ExistsClause
): clause is LiteralMapClause<T, Operation> =>
		isObject(clause) && !(clause instanceof ExistsClause);

function createOperator<OP extends Operation>(operation: OP) {
	function operator<T>(...queries: [LiteralMapClause<T, Operation>])
		: LiteralMapClause<T, OP>;
	function operator<T>(...queries: [HigherClause<T, Operation>])
		: HigherClause<T, OP>;
	function operator<T>(...queries: (HigherClause<T, Operation> | LiteralMapClause<T, Operation>)[])
		: HigherClause<T, OP>;
	function operator<T>(...queries: (HigherClause<T, Operation> | LiteralMapClause<T, Operation>)[]
		| [LiteralMapClause<T, Operation>]
	) : (HigherClause<T, OP> | LiteralMapClause<T, OP>)
	{
		const [query] = queries;
		if (queries.length === 1 && isLiteralMapClause(query)) {
			query.operation = operation;
			return query as LiteralMapClause<T, OP>;
		}
		(queries as HigherClause<T, OP>).operation = operation;
		return queries as HigherClause<T, OP>;
	}

	return operator;
}

export const and = createOperator("AND");
export const or = createOperator("OR");
export const not = createOperator("NOT");

export const isNotClause = <T>(clause:
	ExistsClause
	| MaybeArray<Literal>
	| LiteralMapClause<T, Operation>
	| HigherClause<T, Operation>
): clause is LiteralMapClause<T, "NOT"> =>
		isObject(clause) && "NOT" in clause;

/**
 * A query clause where:
 * * An array is a collection of query clauses interpreted with the chosen[1] operator.
 * * An object is a map between search terms and their respective search term literals. The search terms are interpreted with a chosen[1] operator.
 *
 *  [1] Use the `or()`, `and()` and `not()` functions to choose the operator for a clause. Clauses default to an "and" operator.
 */
export type Query<T> = HigherClause<T, Operation> | LiteralMapClause<T, Operation>;

const RESERVED_SYNTAX =  ["\"", " AND ", " OR ", " NOT ", "(", ")"];

export const parseQuery = <T>(...queries: HigherClause<T, Operation>): string => {
	const withBracketsIfNeeded = (
		predicate: (clause: HigherClause<T, Operation> | LiteralMapClause<T, Operation>) => string
	) =>
		(clause: HigherClause<T, Operation> | LiteralMapClause<T, Operation>) => {
			const parsedClause = predicate(clause);
			if (clause.operation === "NOT") {
				return `(${parsedClause})`;
			}
			if (isHigherClause(clause) && clause.length > 1
				|| Object.keys(omit(clause, "operation")).length > 1) {
				return `(${parsedClause})`;
			}
			return parsedClause;
		};

	const parseClause = (clause: HigherClause<T, Operation> | LiteralMapClause<T, Operation>) =>
		isHigherClause(clause)
			? parseHigherClause(clause)
			: parseLiteralMapClause(clause);

	const parseHigherClause = (clause: HigherClause<T, Operation>): string => {
		if (!clause.length) {
			return "";
		}
		if (clause.operation === "NOT") {
			// [...clause] drops the `operator` so it's interpreted as falling back to  the default operator (= AND).
 			const wrappedClause = [...clause];
			return `NOT ${withBracketsIfNeeded(parseClause)(wrappedClause)}`;
		}
		return clause
			.filter(parseClause)
			.map(withBracketsIfNeeded(parseClause)).join(` ${clause.operation || "AND"} `);
	};

	const parseLiteralMapClause = (clause: LiteralMapClause<T, Operation>): string => {
		const { operation = "AND", ...wrappedClause } = clause;
		Object.keys(wrappedClause).forEach((k: keyof Omit<LiteralMapClause<T, Operation>, "operation">) => {
			if (wrappedClause[k] === undefined) {
				delete wrappedClause[k];
			}
		});
		if (!Object.keys(wrappedClause).length) {
			return "";
		}
		if (operation === "NOT") {
			return `NOT ${withBracketsIfNeeded(parseLiteralMapClause)(wrappedClause as any)}`;
		}
		return (Object.keys(wrappedClause) as (Exclude<KeyOf<T>, Operation>)[]).map(k => {
			const subClause = clause[k]!;
			if (isExistsClause(subClause)) {
				return `_exists_: "${k}"`;
			} else if (isRangeClause(subClause)) {
				return `${k}: ${subClause.value}`;
			}
			return `${k}: ${Array.isArray(subClause) ? parseLiteralsOr(subClause) : parseLiteral(subClause)}`;
		}).join(` ${operation} `);
	};

	const parseLiteral = (clause: Literal) => {
		if (typeof clause === "string") {
			if (RESERVED_SYNTAX.some(reservedSyntax => clause.toUpperCase().includes(reservedSyntax))) {
				throw new ErrorCodeException(
					"STORE_RESERVED_SYNTAX",
					422,
				);
			}
			return  `"${clause}"`;
		}
		return`${clause}`;
	};

	const parseLiteralsOr = (clause: Literal[]) =>
		`(${clause.map(subClause => parseLiteral(subClause)).join(" ")})`;

	const parsed = parseClause(queries);

	return (parsed[0] === "(" && parsed[parsed.length - 1] === ")")
		? parsed.substring(1, parsed.length - 1) // Remove unnecessary outermost brackets.
		: parsed;
};

// Exported so code defining a query can say what a clause should look like safely, since
// StoreQueryLiteralMapOperation's "operation" is allowed to be undefined (defaults to "and"), hence trying to type an
// "or" or "not" clause with it would allow any operation actually.
export type QueryLiteralMap<T, OP extends Operation | undefined = undefined> = OP extends ("AND" | undefined)
	? LiteralMapClause<T, "AND">
		: OP extends "OR"
			? LiteralMapClause<T, "OR"> & { operation: OP }
			: LiteralMapClause<T, "NOT"> & { operation: OP };

export const getQueryVocabulary = <T>() => ({
	and: and<T>,
	or: or<T>,
	not: not<T>,
	exists,
	range
});
