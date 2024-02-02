import { HttpException } from "@nestjs/common";
import { MaybeArray, omit } from "src/type-utils";

/** Defaults to "AND" */
type Operation = "AND" | "OR";

type StoreQueryHigherOperation<T, OP extends Operation> =
	(StoreQueryHigherOperation<T, Operation> | StoreQueryLiteralMapOperation<T, Operation>)[]
	& { operation?: OP };

const isHigherOperation = <T>(
	clause: Omit<StoreQueryHigherOperation<T, Operation> | StoreQueryLiteralMapOperation<T, Operation>, "operation">
): clause is StoreQueryHigherOperation<T, Operation> =>
		Array.isArray(clause);

type StoreQueryLiteral = string | boolean | number;

type StoreQueryLiteralMapOperation<T, OP extends Operation> =
	Partial<Record<Extract<keyof T, string>, MaybeArray<StoreQueryLiteral>>> & { operation?: OP };

const isLiteralMapOperation = <T>(
	clause: Omit<StoreQueryLiteralMapOperation<T, Operation>, "operation">
	| Omit<StoreQueryHigherOperation<T, Operation>, "operation">
): clause is StoreQueryLiteralMapOperation<T, Operation> =>
		!Array.isArray(clause);

function operator<OP extends Operation>(operation: OP) {
	function _<T>(...queries: [Omit<StoreQueryLiteralMapOperation<T, Operation>, "operation">])
		: StoreQueryLiteralMapOperation<T, OP>;
	function _<T>(...queries: (StoreQueryHigherOperation<T, Operation> | StoreQueryLiteralMapOperation<T, Operation>)[])
		: StoreQueryHigherOperation<T, OP>;
	function _<T>(...queries:
		(StoreQueryHigherOperation<T, Operation> | StoreQueryLiteralMapOperation<T, Operation>)[]
		| [Omit<StoreQueryLiteralMapOperation<T, Operation>, "operation">]
	) : (StoreQueryHigherOperation<T, OP> | StoreQueryLiteralMapOperation<T, OP>) {
		const [query] = queries;
		if (queries.length === 1 && isLiteralMapOperation(query)) {
			query.operation = operation;
			return query as StoreQueryLiteralMapOperation<T, OP>;
		}
		(queries as StoreQueryHigherOperation<T, OP>).operation = operation;
		return queries as StoreQueryHigherOperation<T, OP>;
	}

	return _;
}

export const and = operator("AND");
export const or = operator("OR");

/**
 * A query clause where:
 * * An array is a collection of query clauses interpreted with the given operator. Defaults to "and" operator.
 * * An object is a map between search terms and their respective search term literals. The search terms are interpreted with a given operator, which defaults to "and".
 *
 *  Use the `or()` and `and()` wrappers to choose the operator for a clause. They accept either an array or an object.
 */
export type StoreQuery<T> = StoreQueryHigherOperation<T, Operation> | StoreQueryLiteralMapOperation<T, Operation>;

const RESERVED_SYNTAX =  ["\"", "AND", "OR", "(", ")"];

export const parseQuery = <T>
	(...queries: StoreQueryHigherOperation<T, Operation> | [StoreQueryLiteralMapOperation<T, Operation>])
	: string =>
{

	const withBracketsIfNeeded = (
		op: (clause: StoreQueryHigherOperation<T, Operation> | StoreQueryLiteralMapOperation<T, Operation>) => string
	) =>
		(clause: StoreQueryHigherOperation<T, Operation> | StoreQueryLiteralMapOperation<T, Operation>) => {
			const parsedClause = op(clause);
			if (isHigherOperation(clause) && clause.length > 1
				|| Object.keys(omit(clause, "operation")).length > 1) {
				return `(${parsedClause})`;
			}
			return parsedClause;
		};

	const parseHigherOperation = (clause: StoreQueryHigherOperation<T, Operation>): string =>
		clause.map(withBracketsIfNeeded(subClause => isHigherOperation(subClause)
			? parseHigherOperation(subClause)
			: parseLiteralOperation(subClause))
		).join(` ${clause.operation || "AND"} `);

	const parseLiteralOperation = (clause: StoreQueryLiteralMapOperation<T, Operation>) => {
		const { operation = "AND", ...realClause } = clause;
		return (Object.keys(realClause) as Extract<keyof T, string>[]).map(k => {
			const subClause  = clause[k]!;
			return `${k}: ${Array.isArray(subClause) ? parseLiteralsArray(subClause) : parseLiteral(subClause)}`;
		}).join(` ${operation} `);
	};

	const parseLiteral = (clause: StoreQueryLiteral) => {
		if (typeof clause === "string") {
			if (RESERVED_SYNTAX.some(reservedSyntax => clause.toUpperCase().includes(reservedSyntax))) {
				// eslint-disable-next-line max-len
				throw new HttpException(`Store query literals containing reserved syntax (${RESERVED_SYNTAX.join(", ")}) is not allowed`, 422);
			}
			return  `"${clause}"`;
		}
		return`${clause}`;
	};

	const parseLiteralsArray = (clause: StoreQueryLiteral[]) =>
		`(${clause.map(subClause => parseLiteral(subClause)).join(" ")})`;

	const [query] = queries;
	const parsed = (queries.length === 1 && isLiteralMapOperation(query))
		? parseLiteralOperation(query)
		: parseHigherOperation(queries);

	return (parsed[0] === "(" && parsed[parsed.length - 1] === ")")
		? parsed.substring(1, parsed.length - 1) // Remove unnecessary outermost brackets.
		: parsed;
};

// Exported so code defining a query can say what a clause should look like safely, since StoreQueryLiteralMapOperation's
// "operation" is allowed to be undefined, hence trying to type an "or" clause with it would allow any operation actually.
export type StoreQueryMapLiteral<T, OP extends Operation | undefined> = OP extends ("AND" | undefined)
	? StoreQueryLiteralMapOperation<T, "AND">
	: StoreQueryLiteralMapOperation<T, "OR"> & { operation: OP };
