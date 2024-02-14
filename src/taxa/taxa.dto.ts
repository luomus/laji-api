import { Taxon as TaxonI } from "@luomus/laji-schema";
import { HasContext } from "src/common.dto";

export type Taxon = TaxonI & HasContext;
