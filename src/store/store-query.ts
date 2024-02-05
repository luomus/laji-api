import { HttpException } from "@nestjs/common";
import { MaybeArray, omit } from "src/type-utils";

/** Defaults to "AND" */
type Operation = "AND" | "OR";

type HigherOperation<T, OP extends Operation> =
	(HigherOperation<T, Operation> | LiteralMapOperation<T, Operation>)[]
	& { operation?: OP };

const isHigherOperation = <T>(
	clause: Omit<HigherOperation<T, Operation> | LiteralMapOperation<T, Operation>, "operation">
): clause is HigherOperation<T, Operation> =>
		Array.isArray(clause);

type Literal = string | boolean | number;

type LiteralMapOperation<T, OP extends Operation, K extends keyof T & string = keyof T & string> =
	Partial<Record<K, MaybeArray<T[K] & Literal>>> & { operation?: OP };

const isLiteralMapOperation = <T>(
	clause: Omit<LiteralMapOperation<T, Operation>, "operation">
	| Omit<HigherOperation<T, Operation>, "operation">
): clause is LiteralMapOperation<T, Operation> =>
		!Array.isArray(clause);

function operator<OP extends Operation>(operation: OP) {
	function _<T>(...queries: [Omit<LiteralMapOperation<T, Operation>, "operation">])
		: LiteralMapOperation<T, OP>;
	function _<T>(...queries: (HigherOperation<T, Operation> | LiteralMapOperation<T, Operation>)[])
		: HigherOperation<T, OP>;
	function _<T>(...queries: (HigherOperation<T, Operation> | LiteralMapOperation<T, Operation>)[]
		| [Omit<LiteralMapOperation<T, Operation>, "operation">]
	) : (HigherOperation<T, OP> | LiteralMapOperation<T, OP>) {
		const [query] = queries;
		if (queries.length === 1 && isLiteralMapOperation(query)) {
			query.operation = operation;
			return query as LiteralMapOperation<T, OP>;
		}
		(queries as HigherOperation<T, OP>).operation = operation;
		return queries as HigherOperation<T, OP>;
	}

	return _;
}

export const and = operator("AND");
export const or = operator("OR");

/**
 * A query clause where:
 * * An array is a collection of query clauses interpreted with the chosen[1] operator.
 * * An object is a map between search terms and their respective search term literals. The search terms are interpreted with a chosen[1] operator.
 *
 *  [1] Use the `or()` and `and()` wrappers to choose the operator for a clause. Clauses default to an "and" operator.
 */
export type StoreQuery<T> = HigherOperation<T, Operation> | LiteralMapOperation<T, Operation>;

const RESERVED_SYNTAX =  ["\"", "AND", "OR", "(", ")"];

export const parseQuery = <T>
	(...queries: HigherOperation<T, Operation> | [LiteralMapOperation<T, Operation>])
	: string =>
{

	const withBracketsIfNeeded = (
		op: (clause: HigherOperation<T, Operation> | LiteralMapOperation<T, Operation>) => string
	) =>
		(clause: HigherOperation<T, Operation> | LiteralMapOperation<T, Operation>) => {
			const parsedClause = op(clause);
			if (isHigherOperation(clause) && clause.length > 1
				|| Object.keys(omit(clause, "operation")).length > 1) {
				return `(${parsedClause})`;
			}
			return parsedClause;
		};

	const parseHigherOperation = (clause: HigherOperation<T, Operation>): string =>
		clause.map(withBracketsIfNeeded(subClause => isHigherOperation(subClause)
			? parseHigherOperation(subClause)
			: parseLiteralMapOperation(subClause))
		).join(` ${clause.operation || "AND"} `);

	const parseLiteralMapOperation = (clause: LiteralMapOperation<T, Operation>) => {
		const { operation = "AND", ...realClause } = clause;
		return (Object.keys(realClause) as (keyof T & string)[]).map(k => {
			const subClause = clause[k]!;
			return `${k}: ${Array.isArray(subClause) ? parseLiteralsOr(subClause) : parseLiteral(subClause)}`;
		}).join(` ${operation} `);
	};

	const parseLiteral = (clause: Literal) => {
		if (typeof clause === "string") {
			if (RESERVED_SYNTAX.some(reservedSyntax => clause.toUpperCase().includes(reservedSyntax))) {
				// eslint-disable-next-line max-len
				throw new HttpException(`Store query literals containing reserved syntax (${RESERVED_SYNTAX.join(", ")}) is not allowed`, 422);
			}
			return  `"${clause}"`;
		}
		return`${clause}`;
	};

	const parseLiteralsOr = (clause: Literal[]) =>
		`(${clause.map(subClause => parseLiteral(subClause)).join(" ")})`;

	const [query] = queries;
	const parsed = (queries.length === 1 && isLiteralMapOperation(query))
		? parseLiteralMapOperation(query)
		: parseHigherOperation(queries);

	return (parsed[0] === "(" && parsed[parsed.length - 1] === ")")
		? parsed.substring(1, parsed.length - 1) // Remove unnecessary outermost brackets.
		: parsed;
};

// Exported so code defining a query can say what a clause should look like safely, since StoreQueryLiteralMapOperation's
// "operation" is allowed to be undefined, hence trying to type an "or" clause with it would allow any operation actually.
export type LiteralMap<T, OP extends Operation | undefined> = OP extends ("AND" | undefined)
	? LiteralMapOperation<T, "AND">
	: LiteralMapOperation<T, "OR"> & { operation: OP };
