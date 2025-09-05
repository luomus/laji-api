import { HttpException, Injectable } from "@nestjs/common";
import { AbstractAutocompleteService } from "./abstract-autocomplete.service";
import { TaxaService } from "src/taxa/taxa.service";
import { SearchMatchType } from "src/taxa/taxa.dto";

/** Map from 2 letter codes to EURING/Birdlife code */
const nameToBirdCode: Record<string, string> = {
	"AA": "ALAARV",
	"AT": "ANTTRI",
	"AP": "ANTPRA",
	"TT": "TROTRO",
	"ER": "ERIRUB",
	"TM": "TURMER",
	"TI": "TURILI",
	"SB": "SYLBOR",
	"PS": "PHYSIB",
	"PT": "PHYLUS",
	"RR": "REGREG",
	"MS": "MUSSTR",
	"FH": "FICHYP",
	"PD": "PASDOM",
	"FC": "FRICOE",
	"FM": "FRIMON",
	"CS": "CARSPI",
	"CE": "CARERY",
	"EC": "EMBCIT",
	"VV": "VANVAN",
	"NA": "NUMARQ",
	"TO": "TRIOCH",
	"TG": "TRIGLA",
	"CP": "COLPAL",
	"MA": "MOTALB",
	"LL": "LUSLUS",
	"LOXSP": "lox sp",
	"LOXSP.": "lox sp",
	"LOXIA": "loxia"
};

const typeMapping: Record<string, string> = {
	X: "MY.lineTransectObsTypeSong",
	V: "MY.lineTransectObsTypeOtherSound",
	O: "MY.lineTransectObsTypeSeen",
	AO: "MY.lineTransectObsTypeFlock",
	K: "MY.lineTransectObsTypeSeenMale",
	N: "MY.lineTransectObsTypeSeenFemale",
	Y: "MY.lineTransectObsTypeFlyingOverhead",
	AY: "MY.lineTransectObsTypeFlockFlyingOverhead",
	PARI: "MY.lineTransectObsTypeSeenPair",
	POIKUE: "MY.lineTransectObsTypeSeenBrood",
	PESA: "MY.lineTransectObsTypeSeenNest"
};

const lineMapping: Record<string, string> = {
	A: "MY.lineTransectRouteFieldTypeOuter",
	P: "MY.lineTransectRouteFieldTypeInner"
};


@Injectable()
export class LineTransectUnitShorthandAutocompleteService implements AbstractAutocompleteService<undefined> {
	constructor(private taxaService: TaxaService) {}

	async autocomplete(query: string) {
		query = query.trim();
		// 1. (LOXSP\.?|LOXIA|[A-Z]{2}|[A-Z]{6}?) Capture taxon that has length of 2, 6 and some special cases with optional "." character at the end
		// Note that there will be trouble with taxon len 6 that ends with an A-character!
		// 2. (A)? Could have A here to indicate pair
		// 3. ([1-9]+[0-9]*)? Capture count
		// 4. (X|V|O|K|N|Y|PARI|POIKUE|PESA)? Capture type
		// 5. ([AP])? Capture line
		const parser  =
			/^(LOXSP\.?|LOXIA|[A-Z]{2}|[A-Z]{6}?)(A)?([1-9]+[0-9]*)?(X|V|O|K|N|Y|PARI|POIKUE|PESA)?([AP])?$/g;
		const matches = parser.exec(query
			.toUpperCase()
			.replace(/\s/g, "")
			.replace("PESÄ","PESA")
		);
		if (matches === null) {
			throw new HttpException("Invalid line transect short hand value. Could not parse query", 422);
		}

		const [_, taxonStr, isPairStr, countStr, typeStr, lineStr] = matches;

		const taxonBirdCode  = taxonStr && nameToBirdCode[taxonStr] || taxonStr || "";
		const isPair = isPairStr === "A";
		const count  = parseInt(countStr || "1", 10);
		const type = isPair ? "A" + typeStr : typeStr;
		const line = lineStr || "A";

		if (!type) {
			throw new HttpException("Invalid line transect short hand value. Missing type.", 422);
		}
		if (isPair && ["AO", "AY"].indexOf(type) === -1) {
			throw new HttpException(
				"Invalid line transect short hand value. Pair (A) marking can only be used when type is O or Y"
				, 422
			);
		}

		const taxa = await this.taxaService.search({
			query: taxonBirdCode,
			limit: 1,
			matchType: SearchMatchType.exact
		});
		const [ taxon ] = taxa;
		if (!taxon) {
			throw new HttpException( "Invalid line transect short hand value. No taxon found for the query" , 422);
		}

		return {
			key: query,
			value: query,
			unit: {
				shortHandText: query,
				identifications: [{
					taxon: taxon.scientificName
				}],
				informalTaxonGroups: taxon.informalGroups?.map(group => group.id) || undefined,
				unitFact: {
					autocompleteSelectedTaxonID: taxon.id,
					lineTransectObsType: typeMapping[type] || "",
					lineTransectRouteFieldType: lineMapping[line],
				},
				pairCount: interpretCount("pair", count, type, isPair, taxon.id),
				individualCount: interpretCount("individual", count, type, isPair, taxon.id),
			},
			interpretedFrom: {
				taxon: taxonStr,
				isPair: isPairStr,
				count: countStr,
				type: typeStr,
				line: lineStr,
			}
		};
	}
}

const use5 = [
	"MX.36817",
	"MX.36573",
	"MX.33117",
	"MX.37166",
	"MX.36287",
	"MX.36356",
	"MX.36355",
	"MX.36358",
	"MX.36359",
	"MX.36355"
];

const interpretCount = (
	place: "pair" | "individual",
	count: number,
	type: string,
	isPair: boolean,
	taxonID: string
) => {
	if (type === "POIKUE" && place === "individual") {
		return undefined;
	}
	const multiplier = use5.indexOf(taxonID) > -1 && type !== "PARI" ? 5 : 2;
	if (["PARI","POIKUE","PESA"].indexOf(type) > -1) {
		if (place === "individual" && ["POIKUE","PESA"].indexOf(type) > -1) {
			return undefined;
		}
		return place === "pair" ? count : count * multiplier;
	}
	if (!isPair) {
		return count;
	}
	return place === "individual" ? count : Math.ceil(count / multiplier);
};

