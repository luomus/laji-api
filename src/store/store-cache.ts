import { KeyOf, MaybeArray, omit } from "src/typing.utils";
import { Query, HigherClause, LiteralMapClause, Operation, Literal, ExistsClause,
	isExistsClause, exists, isLiteralMapClause, isRangeClause, RangeClause } from "./store-query";
import { asArray } from "src/utils";

const parseLiteralsOr = (clause: Literal[], separator = ";") => clause.sort().join(separator);
const parseLiteral = (clause: Literal) => "" + clause;
const parseExistsClause = () => "*";
const parseRangeClause = (clause: RangeClause) => clause.value;
const parseNotExistsClause = () => "__undefined__";

const nonOperativeKeys = <T>(clause: LiteralMapClause<T, Operation>) =>
	Object.keys(clause).filter(k => k !== "operation") as Exclude<(KeyOf<T>), "operation">[];

const parseLiteralValue = (clause?: MaybeArray<Literal>, separator?: string): string => {
	if (clause === undefined) {
		return "*";
	}
	if (Array.isArray(clause)) {
		return parseLiteralsOr(clause, separator);
	}
	return parseLiteral(clause);
};

const parseLiteralMapValue = (clause?: MaybeArray<Literal> | ExistsClause, separator?: string): string => {
	if (isExistsClause(clause)) {
		return parseExistsClause();
	} else if (isRangeClause(clause)) {
		return parseRangeClause(clause);
	}
	return parseLiteralValue(clause, separator);
};

const parseFlattenedLiteralMapClause = <T>(
	clause: Partial<Record<KeyOf<T>, MaybeArray<Literal> | ExistsClause>>,
	keys: Readonly<KeyOf<T>[]>
): string => {
	return [...keys].sort().reduce((cacheKey, prop) => {
		const parsed = parseLiteralMapValue(clause[prop]);
		const stringified = `key_${prop}:;${parsed};`;
		return `${cacheKey}${stringified}`;
	}, "");
};

/**
 * Flattens nested higher clauses into a map of keys and all the used search literals.
 *
 * For example: and({ a: 1, b: 2 }, or({ a: 2 }, and({ b : 3 }, { c: 4 }))) => { a: [ 1, 2 ] b: [ 2, 3 ], c: [ 4 ] }
 */
const flatten = <T>(
	clause: HigherClause<T, Operation> | LiteralMapClause<T, Operation>
): Record<KeyOf<T>, MaybeArray<Literal> | ExistsClause> => {
	if (clause.operation === "NOT" && isLiteralMapClause(clause) && nonOperativeKeys(clause).length === 1) {
		const term = nonOperativeKeys(clause)[0]!;
		return { [term]: parseNotExistsClause() } as Record<KeyOf<T>, string>;
	}
	if (isLiteralMapClause(clause)) {
		return omit(clause, "operation") as any;
	}

	return clause.reduce((reduced, subClause) => {
		if (subClause.operation === "NOT") {
			if (isLiteralMapClause(subClause) && nonOperativeKeys(subClause).length === 1) {
				const term = nonOperativeKeys(subClause)[0]!;
				if (!isExistsClause(subClause[term])) {
					throw new Error("Cache parser cannot handle a non singular 'NOT' clause that isn't 'exists'");
				}
				reduced[term] = [
					...asArray(reduced[term] as any).filter(v => v !== undefined),
					parseNotExistsClause()
				];
				return reduced;
			}
			throw new Error("Cache parser cannot handle a 'NOT' clause that isn't a singular 'exists'");
		}
		const flattenedSubClause = flatten(subClause);
		(Object.keys(flattenedSubClause) as (KeyOf<T>)[]).forEach(k => {
			if (k === "operation") {
				return;
			}
			const flattenedReducedVal = reduced[k];
			const flattenedVal = flattenedSubClause[k];
			if (isExistsClause(flattenedReducedVal) || isExistsClause(flattenedVal)) {
				reduced[k] = exists;
				return;
			}
			reduced[k] = k in reduced
				? [...asArray(flattenedReducedVal), ...asArray(flattenedVal)]
				: flattenedSubClause[k];
		});
		return reduced;
	}, {} as Record<KeyOf<T>, MaybeArray<Literal> | ExistsClause>);
};

export const getCacheKeyForQuery = <T>(query: Query<T>, config: StoreCacheOptions<T>) => {
	const { keys, primaryKeys } = config;
	const flattened = flatten(query);
	process.env.NODE_ENV !== "production" && primaryKeys?.forEach(key => {
		if (!(key in flattened)) {
			throw new Error(`Primary keys must be always in a query! Key '${key}' missing`);
		}
	});
	process.env.NODE_ENV !== "production" && (Object.keys(flattened) as (KeyOf<T>)[]).forEach(key => {
		if (!keys.includes(key)) {
			// eslint-disable-next-line max-len
			throw new Error(`All search terms used in a query must be configured to the cache option \`keys\`! Search term '${key}' isn't in the \`keys\`.`);
		}
	});
	return parseFlattenedLiteralMapClause(flattened, keys);
};

export type OnlyNonArrayLiteralKeys<T> = { [K in KeyOf<T>]: T[K] extends (Literal | undefined) ? K : never }[KeyOf<T>];

export type StoreCacheOptions<ResourceQuery> = {
	/** Must be an array of all keys possible in a query */
	keys: Readonly<KeyOf<ResourceQuery>[]>;
	/** Keys that are always defined for a query. They can't be of array type. */
	primaryKeys?: OnlyNonArrayLiteralKeys<ResourceQuery>[];
	/** Whether caching is enabled for the read operation. Doesn't affect writing operations - they always try to flush. True by default. */
	enabled?: boolean;
};

export type QueryCacheOptions<ResourceQuery> = Partial<StoreCacheOptions<ResourceQuery>>;

export const getCacheKeyForResource = <
	Resource extends Record<string, MaybeArray<Literal>>,
	ResourceQuery extends Partial<Resource> = Resource
	>(resource: Partial<Resource>, options: StoreCacheOptions<ResourceQuery>) => {
	const { keys, primaryKeys } = options;
	resource = fillWithPrimaryAsUndefineds(resource, primaryKeys);
	return [...keys].sort().reduce((cacheKey, prop) => {
		const parsed = parseLiteralMapValue(resource[prop], ";*;");
		const val = (primaryKeys && !(primaryKeys as KeyOf<Resource>[]).includes(prop))
			? "*"
			: parsed === "*"
				? `;${parsed};`
				: `*;${parsed};*`;
		const stringified = `key_${prop}:${val}`;
		return `${cacheKey}${stringified}`;
	}, "");
};

const fillWithPrimaryAsUndefineds = <Resource, ResourceQuery>(
	resource: Partial<Resource>,
	primaryKeys: OnlyNonArrayLiteralKeys<ResourceQuery>[] | undefined
) => {
	if (!primaryKeys) {
		return resource;
	}
	return primaryKeys.reduce((filledWithUndefineds, k) => ({
		...filledWithUndefineds,
		[k]: k in filledWithUndefineds ? (filledWithUndefineds as any)[k] : parseNotExistsClause()
	} as Resource), resource);
};

