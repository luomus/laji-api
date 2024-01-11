const defaultDomain = 'http://tun.fi/';

const namespaces: Record<string, string> = {
    'luomus:': 'http://id.luomus.fi/',
    'dc:': 'http://purl.org/dc/terms/',
    'rdfs:': 'http://www.w3.org/2000/01/rdf-schema#',
    'rdf:': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'xsd:': 'http://www.w3.org/2001/XMLSchema#',
    'syke:': 'http://metatieto.ymparisto.fi:8080/geoportal/rest/document?id=',
    'xml:': 'http://www.w3.org/XML/1998/namespace#',
    'owl:': 'http://www.w3.org/2002/07/owl#',
    'vcard:': 'http://www.w3.org/2006/vcard/ns#',
    'dwc:': 'http://rs.tdwg.org/dwc/terms/',
    'dwctype:': 'http://rs.tdwg.org/dwc/dwctype/',
    'abcd:': 'http://www.tdwg.org/schemas/abcd/2.06#',
    'naturforskaren:': 'http://naturforskaren.se/',
    'eol:': 'http://eol.org/',
    'skos:': 'http://www.w3.org/2004/02/skos/core#',
    'dyntaxa:': 'http://dyntaxa.se/Taxon/Info/',
    'taxonid:': 'http://taxonid.org/',
    'zmuo:': 'http://id.zmuo.oulu.fi/',
    'herbo:': 'http://id.herb.oulu.fi/',
    'utu:': 'http://mus.utu.fi/',
    'tax:': 'http://rs.taxonid.org/',
};

const nsValues: string[] = [], nsKeys: string[] = [];
for (const i in namespaces) {
    if (namespaces.hasOwnProperty(i)) {
        nsKeys.push(i);
        nsValues.push(namespaces[i]);
    }
}

function replaceAll(value: string, find: string[], replace: string[]) {
    for (let i = 0; i < find.length; i++) {
        value = value.replace(find[i], replace[i]);
    }
    return value;
}

function getQName(id: string): string;
function getQName(id: string[]): string[];
function getQName(id: string|string[]): string|string[] {
    if (Array.isArray(id)) {
        return id.map(value => getQName(value));
    }
    return replaceAll(('' + id), nsValues, nsKeys).replace(defaultDomain, '');
}

export { getQName };
