import { HttpException, Injectable } from "@nestjs/common";
import { AbstractAutocompleteService } from "./abstract-autocomplete.service";
import { GetWaterBirdPairCountUnitShorthandDto } from "./autocomplete.dto";

enum WaterbirdTaxon {
  CYGOLO = "MX.26277",
  CYGCYG = "MX.26280",
  ANSFAB = "MX.26287",
  ANSANS = "MX.26291",
  BRACAN = "MX.26298",
  BRALEU = "MX.26299",
  FULATR = "MX.27381",
  GAVARC = "MX.25837",
  GAVSTE = "MX.25836",
  PODCRI = "MX.25860",
  PODGRI = "MX.25859",
  PODAUR = "MX.25861",
  TACRUF = "MX.25844",

  TADTAD = "MX.26323",
  ANAPEN = "MX.26360",
  ANASTR = "MX.26364",
  ANACRE = "MX.26366",
  ANAPLA = "MX.26373",
  ANAACU = "MX.26382",
  ANAQUE = "MX.26388",
  ANACLY = "MX.26394",
  AYTMAR = "MX.26416",
  SOMMOL = "MX.26419",
  CLAHYE = "MX.26427",
  MELNIG = "MX.26429",
  MELFUS = "MX.26431",
  MERALB = "MX.26438",
  MERSER = "MX.26440",
  MERMER = "MX.26442",

  BUCCLA = "MX.26435",

  AYTFER = "MX.26407",
  AYTFUL = "MX.26415",

  PHACAR = "MX.26043",
  ARDCIN = "MX.26094",
  EGRALB = "MX.26105",

  GALMED = "MX.27665",

  GRUGRU = "MX.27214",

  BOTSTE = "MX.26164",
  RALAQU = "MX.27276",
  PORPOR = "MX.27345",
  PORPAR = "MX.27342",
  GALCHL = "MX.27364",
  CRECRE = "MX.27328",
  HAEOST = "MX.27459",
  PLUAPR = "MX.27553",
  VANVAN = "MX.27527",
  CHADUB = "MX.27562",
  CHAHIA = "MX.27559",
  NUMARQ = "MX.27613",
  NUMPHA = "MX.27610",
  LIMLIM = "MX.27603",
  CALTEM = "MX.27689",
  CALALP = "MX.27699",
  ACTHYP = "MX.27634",
  TRIOCH = "MX.27626",
  TRIERY = "MX.27619",
  TRINEB = "MX.27622",
  TRISTA = "MX.27621",
  TRIGLA = "MX.27628",
  TRITOT = "MX.27620",
  LYMMIN = "MX.27674",
  GALGAL = "MX.27666",
  CALFAL = "MX.27704",

  CALPUG = "MX.27710",

  STEALB = "MX.27821",
  STECAS = "MX.27797",
  CHLNIG = "MX.27791",
  STEHIR = "MX.27801",
  STEAEA = "MX.27802",
  HYDMIN = "MX.27777",
  LARRID = "MX.27774",
  LARCAN = "MX.27748",
  LARFUS = "MX.27753",
  LARARG = "MX.27750",
  LARMAR = "MX.27759",

  ORIORI = "MX.36871",
  PICPIC = "MX.37122",
  CORNIX = "MX.73566",
  MOTALB = "MX.32183",
  EMBSCH = "MX.35182",
  ACRSCH = "MX.33641",
  ACRSCI = "MX.33646",
  ACRRIS = "MX.33649",
  ACRDUM = "MX.33650",
  ACRARU = "MX.33651",
  PANBIA = "MX.33492"
}

export interface ParsedCounts {
  female: number;
  male: number;
  unknown: number;
  singing: number;
  uttering: number;
  total: number;
  totalMaleFemaleUnknown: number;
}

const wt = WaterbirdTaxon;

const waterbirdGroup1 = [
	wt.CYGOLO, wt.CYGCYG, wt.ANSFAB, wt.ANSANS, wt.BRACAN, wt.BRALEU, wt.FULATR, wt.GAVARC, wt.GAVSTE
];
const waterbirdGroup2 = [
	wt.TADTAD, wt.ANAPEN, wt.ANASTR, wt.ANACRE, wt.ANAPLA, wt.ANAACU, wt.ANAQUE, wt.ANACLY, wt.AYTMAR, wt.SOMMOL,
	wt.CLAHYE, wt.MELNIG, wt.MELFUS, wt.MERALB, wt.MERSER, wt.MERMER
];
const waterbirdGroup3 = [
	wt.BUCCLA
];
const waterbirdGroup4 = [
	wt.AYTFUL, wt.AYTFER
];
const waderGroup1 = [
	wt.PHACAR, wt.ARDCIN, wt.EGRALB, wt.PODCRI, wt.PODGRI, wt.PODAUR, wt.TACRUF
];
const waderGroup2 = [
	wt.GALMED
];
const waderGroup3 = [
	wt.GRUGRU
];
const waderGroup4 = [
	wt.BOTSTE, wt.RALAQU, wt.PORPOR, wt.PORPAR, wt.GALCHL, wt.CRECRE, wt.HAEOST, wt.PLUAPR, wt.VANVAN, wt.CHADUB,
	wt.CHAHIA, wt.NUMARQ, wt.NUMPHA, wt.LIMLIM, wt.CALTEM, wt.CALALP, wt.ACTHYP, wt.TRIOCH, wt.TRIERY, wt.TRINEB,
	wt.TRISTA, wt.TRIGLA, wt.TRITOT, wt.LYMMIN, wt.GALGAL, wt.CALFAL
];
const waderGroup5 = [
	wt.CALPUG
];
const gullGroup = [
	wt.STEALB, wt.STECAS, wt.CHLNIG, wt.STEHIR, wt.STEAEA, wt.HYDMIN, wt.LARRID, wt.LARCAN, wt.LARFUS, wt.LARARG,
	wt.LARMAR
];
const passerineGroup = [
	wt.ORIORI, wt.PICPIC, wt.CORNIX, wt.MOTALB, wt.EMBSCH, wt.ACRSCH, wt.ACRSCI, wt.ACRRIS, wt.ACRDUM, wt.ACRARU,
	wt.PANBIA
];

@Injectable()
export class WaterBirdPairCountUnitShorthandAutocompleteService
implements AbstractAutocompleteService<Omit<GetWaterBirdPairCountUnitShorthandDto, "query">> {

	autocomplete(query: string, { taxonID }: Omit<GetWaterBirdPairCountUnitShorthandDto, "query">) {
		query = query.replace(/\s+/g, ""); // remove spaces

		if (!taxonID) {
			throw new HttpException("Invalid count value. Missing taxonID", 422);
		}

		const matches = /^[\dknpKNPÄä\,\.]*$/.exec(query);
		if (!matches) {
			throw new HttpException("Invalid count value. Could not parse count", 422);
		}

		const { parsedQuery, parsedCounts } = parseQuery(query);

		const taxonIds  = Object.keys(WaterbirdTaxon) as WaterbirdTaxon[];
		if ((taxonIds as any).indexOf(taxonID) === -1 || parsedQuery.length === 0) {
			return { key: parsedQuery, value: undefined };
		}

		const pairCount = getPairCount(parsedCounts, taxonID as WaterbirdTaxon);

		return { key: parsedQuery, value: pairCount };
	}




}

const parseQuery = (query: string): {parsedQuery: string, parsedCounts: ParsedCounts[]} => {
	const counts: Omit<ParsedCounts,"total" | "totalMaleFemaleUnknown">[] = [];

	query = query
		.replace(/K/g, "k")
		.replace(/N/g, "n")
		.replace(/P/g, "p")
		.replace(/\./g, ",");
	// replace repeated characters with one
	query = query
		.replace(/p+/g, "p")
		.replace(/k+/g, "k")
		.replace(/n+/g, "n")
		.replace(/Ä+/g, "Ä")
		.replace(/ä+/g, "ä");

	const parsedQuery = query.split(",").filter(val => !!val).map(val => {
		let males = 0, females = 0, unknown = 0, singing = 0, uttering = 0;

		const observations = val.match(/(?!$)\d*([knpÄä]|$)/g);
		observations!.forEach(obs => {
			const parts = obs.split(/(?=[knpÄä])/g);
			const count = !isNaN(parseInt(parts[0]!, 10)) ? parseInt(parts[0]!, 10) : 1;
			const type = isNaN(parseInt(parts[parts.length - 1]!, 10)) ? parts[parts.length - 1]! : undefined;

			if (type === "p") {
				males += count;
				females += count;
			} else if (type === "k") {
				males += count;
			} else if (type === "n") {
				females += count;
			} else if (type === "Ä") {
				singing += count;
			} else if (type === "ä") {
				uttering += count;
			} else {
				unknown += count;
			}
		});

		if (males === 0 && females === 0 && unknown === 0 && singing === 0 && uttering === 0) {
			return "";
		}

		const hasBothUnknownAndKnown = unknown > 0 && (males > 0 || females > 0 || singing > 0 || uttering > 0);

		if (hasBothUnknownAndKnown) {
			counts.push({ male: males, female: females, unknown: 0, singing, uttering });
			counts.push({ male: 0, female: 0, unknown: unknown, singing: 0, uttering: 0 });
		} else {
			counts.push({ male: males, female: females, unknown, singing, uttering });
		}

		return countToText(males, "k") +
			countToText(females, "n") +
			countToText(singing, "Ä") +
			countToText(uttering, "ä") +
			(hasBothUnknownAndKnown ? ", " : "") +
			(unknown ? unknown : "");
	}).filter(val => !!val).join(", ");

	const parsedCounts: ParsedCounts[] = counts.map(count => ({
		...count,
		total: count.male + count.female + count.singing + count.uttering + count.unknown,
		totalMaleFemaleUnknown: count.male + count.female + count.unknown
	}));

	return { parsedQuery, parsedCounts };
};


const countToText = (count: number, type: string) => {
	return count ? ((count > 1 ? count : "") + type) : "";
};

const getPairCount = (counts: ParsedCounts[], taxonId: WaterbirdTaxon): number => {
	let result = getSingingAndUtteringPairCount(counts, taxonId);

	if (waterbirdGroup1.indexOf(taxonId) !== -1) {
		result += getSum(counts.map(count => getWaterBirdGroup1PairCount(count, taxonId)));
	} else if (waterbirdGroup2.indexOf(taxonId) !== -1) {
		counts = counts.filter(count => !(count.male > 4 || count.female > 4));
		const femaleSum = getSum(counts.map(count => count.female));
		const maleSum = getSum(counts.map(count => count.male));
		result += Math.max(femaleSum, maleSum);
	} else if (waterbirdGroup3.indexOf(taxonId) !== -1) {
		counts = counts.filter(count => !(count.male > 4));
		result += getSum(counts.map(count => count.male));
	} else if (waterbirdGroup4.indexOf(taxonId) !== -1) {
		result += getSum(counts.map(count => count.female));
	} else if (waderGroup1.indexOf(taxonId) !== -1) {
		result += getSum(counts.map(count => Math.ceil((count.totalMaleFemaleUnknown) / 2)));
	} else if (waderGroup2.indexOf(taxonId) !== -1) {
		result += getSum(counts.map(count => count.male
			? count.male
			: (count.unknown ? Math.ceil(count.unknown / 2) : 0))
		);
	} else if (waderGroup3.indexOf(taxonId) !== -1) {
		counts = counts.filter(count => !(count.totalMaleFemaleUnknown > 2));
		result += counts.length;
	} else if (waderGroup4.indexOf(taxonId) !== -1) {
		counts = counts.filter(count => !(count.totalMaleFemaleUnknown > 4));
		result += getSum(counts.map(count => count.male ? count.male : (
			count.female ? count.female : Math.ceil(count.unknown / 2)
		)));
	} else if (waderGroup5.indexOf(taxonId) !== -1) {
		const femaleSum = getSum(counts.map(count => count.female));
		const maleSum = getSum(counts.map(count => count.male));
		result += Math.max(femaleSum, maleSum);
	} else if (gullGroup.indexOf(taxonId) !== -1) {
		result += getSum(counts.map(count => Math.ceil(count.totalMaleFemaleUnknown / 2)));
	} else if (passerineGroup.indexOf(taxonId) !== -1) {
		result += getSum(counts.map(count => count.male
			? count.male
			: Math.ceil(count.totalMaleFemaleUnknown / 2))
		);
	}

	return result;
};

const getWaterBirdGroup1PairCount = (count: ParsedCounts, taxonId: WaterbirdTaxon) => {
	if (count.totalMaleFemaleUnknown > 2) {
		return 0;
	}
	if (count.male === 2 && taxonId === WaterbirdTaxon.FULATR) {
		return 2;
	}
	if (count.unknown || count.male || count.female) {
		return 1;
	}
	return 0;
};

const getSingingAndUtteringPairCount = (counts: ParsedCounts[], taxonId: WaterbirdTaxon) => {
	let singingPairCount: number;
	if (passerineGroup.indexOf(taxonId) !== -1) {
		singingPairCount = getSum(counts.map(count => count.male > 0 && count.singing === 1
			? 0
			: count.singing
		));
	} else {
		singingPairCount = getSum(counts.map(count => count.singing));
	}
	const utteringPairCount = getSum(counts.map(count => Math.ceil(count.uttering / 2)));
	return singingPairCount + utteringPairCount;
};

const getSum = (array: number[]) => {
	return array.reduce((a: number, b: number) => {
		return a + b;
	}, 0);
};
