const config = require("./config.json");
const helpers = require("./helpers");
const { apiRequest, url } = helpers;
const { accessToken, personToken } = config;

describe("", function() {
	const basePath = "/shorthand";

	it("parses line transect unit taxon correct for llx", async function() {
		this.timeout(10000);
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/line-transect`, { query: "llx" }));
		res.should.have.status(200);
		res.body.should.include.keys("key", "value", "unit");
		res.body.value.should.not.contain("undefined");
		res.body.unit.should.have.property("shortHandText").eql("llx");
		res.body.unit.unitFact.should.have.property("autocompleteSelectedTaxonID").eql("MX.32819");
	});

	it("parses line transect unit taxon correct for loxia", async function() {
		this.timeout(10000);
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/line-transect`, { query: "loxiax" })) ;
		res.should.have.status(200);
		res.body.should.include.keys("key", "value", "unit");
		res.body["value"].should.not.contain("undefined");
		res.body.unit.should.have.property("shortHandText").eql("loxiax");
		res.body.unit.unitFact.should.have.property("autocompleteSelectedTaxonID").eql("MX.36355");
	});

	it("parses line transect unit taxon correct for loxsp.", async function() {
		this.timeout(10000);
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/line-transect`, { query: "loxsp.x" })) ;
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body["value"].should.not.contain("undefined");
		res.body.unit.should.have.property("shortHandText").eql("loxsp.x");
		res.body.unit.unitFact.should.have.property("autocompleteSelectedTaxonID").eql("MX.36355");
	});

	it("parses line transect unit taxon correct for loxsp", async function() {
		this.timeout(10000);
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/line-transect`, { query: "loxspx" })) ;
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body["value"].should.not.contain("undefined");
		res.body.unit.should.have.property("shortHandText").eql("loxspx");
		res.body.unit.unitFact.should.have.property("autocompleteSelectedTaxonID").eql("MX.36355");
	});

	it("O type number is not parsed like pair in line transect unit taxon", async function() {
		this.timeout(10000);
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/line-transect`, { query: "tt13O" })) ;
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body["value"].should.not.contain("undefined");
		res.body.unit.should.have.property("shortHandText").eql("tt13O");
		res.body.unit.should.have.property("pairCount").eql(13);
		res.body.unit.should.have.property("individualCount").eql(13);
	});

	// eslint-disable-next-line max-len
	it("O type number is not parsed like pair in line transect unit taxon with taxa that is counted in 5", async function() {
		this.timeout(10000);
		const res  = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/line-transect`, { query: "PASDOM17o" })) ;
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body["value"].should.not.contain("undefined");
		res.body.unit.should.have.property("shortHandText").eql("PASDOM17o");
		res.body.unit.should.have.property("pairCount").eql(17);
		res.body.unit.should.have.property("individualCount").eql(17);
	});

	it("PARI type multiplier is always 2", async function() {
		const res  = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/line-transect`, { query: "tt7PARI" })) ;
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body["value"].should.not.contain("undefined");
		res.body.unit.should.have.property("shortHandText").eql("tt7PARI");
		res.body.unit.should.have.property("pairCount").eql(7);
		res.body.unit.should.have.property("individualCount").eql(14);
	});

	it("PARI type multiplier is always 2 even when species is normally multiplied by 5", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/line-transect`, { query: "PASDOM7PARI" })) ;
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body["value"].should.not.contain("undefined");
		res.body.unit.should.have.property("shortHandText").eql("PASDOM7PARI");
		res.body.unit.should.have.property("pairCount").eql(7);
		res.body.unit.should.have.property("individualCount").eql(14);
	});

	function validateTripReportPayloadInterpretedFrom(body, count, name, maleIndividualCount, femaleIndividualCount) {
		const props = {
			taxon: name,
			count,
			maleIndividualCount,
			femaleIndividualCount
		};

		function validateProperty(item, prop, value) {
			return props[prop] === undefined ?
				item.should.not.have.property(prop) :
				item.should.have.property(prop).eql(value);
		}

		body.results.every(item => item.should.include.keys("key", "value"));

		body.results.every(item => validateProperty(item.interpretedFrom, "taxon", name));
		body.results.every(item => validateProperty(item.interpretedFrom, "count", count));
		body.results.every(item => validateProperty(
			item.interpretedFrom, "maleIndividualCount", `${maleIndividualCount}`)
		);
		body.results.every(item => validateProperty(
			item.interpretedFrom, "femaleIndividualCount", `${femaleIndividualCount}`)
		);

		Object.keys({ count, maleIndividualCount, femaleIndividualCount }).forEach(prop => {
			body.results.every(item => validateProperty(item.unit, prop, props[prop]));
		});
	}

	const name = "Parus major";
	const count = "85";
	const maleIndividualCount = 42;
	const femaleIndividualCount = 43;

	it("return unit with taxon data", async function() {
		this.timeout(10000);
		const params = { count, name, maleIndividualCount, femaleIndividualCount };

		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/trip-report`, { query: Object.keys(params).map(p => params[p]).join(" ") }));
		res.should.have.status(200);

		res.body.results.length.should.be.above(1);

		res.body.results.every(item => item.unit.unitFact.should.have.property("autocompleteSelectedTaxonID"));
		res.body.results.every(item => item.unit.identifications[0].should.have.property("taxon"));

	});

	it("parses trip report unit query string correct when all fields present", async function() {
		const params = { count, name, maleIndividualCount, femaleIndividualCount };
		const _params =  Object.keys(params).map(param => params[param]);

		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/trip-report`, { query: Object.keys(params).map(p => params[p]).join(" ") }));
		res.should.have.status(200);

		res.body.results.length.should.be.above(1);
		validateTripReportPayloadInterpretedFrom(res.body, ..._params);
	});

	it("parses trip report unit query string correct when count is missing", async function() {
		const params = { count: undefined, name, maleIndividualCount, femaleIndividualCount };
		const _params =  Object.keys(params).map(param => params[param]);

		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/trip-report`, { query: Object.keys(params).map(p => params[p]).join(" ") }));
		res.should.have.status(200);

		res.body.results.length.should.be.above(1);
		validateTripReportPayloadInterpretedFrom(res.body, ..._params);
	});

	it("parses trip report unit query string correct when taxon is missing", async function() {
		const params = { count, name: undefined, maleIndividualCount, femaleIndividualCount };
		const _params =  Object.keys(params).map(param => params[param]);

		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/trip-report`, { query: Object.keys(params).map(p => params[p]).join(" ") }));
		res.should.have.status(200);

		res.body.results.should.have.lengthOf(1);
		validateTripReportPayloadInterpretedFrom(res.body, ..._params);
	});

	it("parses trip report unit query string correct when femaleIndividualCount is missing", async function() {
		const params = { count, name, maleIndividualCount, femaleIndividualCount: undefined };
		const _params =  Object.keys(params).map(param => params[param]);

		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/trip-report`, { query: Object.keys(params).map(p => params[p]).join(" ") }));
		res.should.have.status(200);

		res.body.results.length.should.be.above(1);
		validateTripReportPayloadInterpretedFrom(res.body, ..._params);
	});

	// eslint-disable-next-line max-len
	it("parses trip report unit query string correct when maleIndividualCount and femaleIndividualCount are missing", async function() {
		const params = { count, name, maleIndividualCount: undefined, femaleIndividualCount: undefined };
		const _params =  Object.keys(params).map(param => params[param]);

		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/trip-report`, { query: Object.keys(params).map(p => params[p]).join(" ") }));
		res.should.have.status(200);

		res.body.results.length.should.be.above(1);
		validateTripReportPayloadInterpretedFrom(res.body, ..._params);
	});

	it("throws 422 when trip report unit query string femaleIndividualCount is non numeric", async function() {
		const params = { count, name, maleIndividualCount, femaleIndividualCount: "many" };

		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/trip-report`, { query: Object.keys(params).map(p => params[p]).join(" ") }));
		res.should.have.status(422);
	});

	// eslint-disable-next-line max-len
	it("returns the query taxon name as taxon if trip report unit exact match wasn't found", async function() {
		let name = "paarus maajor";
		const params = { count, name, maleIndividualCount, femaleIndividualCount };
		const _params =  Object.keys(params).map(param => params[param]);

		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/trip-report`, { query: Object.keys(params).map(p => params[p]).join(" ") }));
		res.should.have.status(200);

		res.body.results.length.should.be.above(1);
		validateTripReportPayloadInterpretedFrom(res.body, ..._params);

		const last = res.body.results[res.body.results.length - 1];

		last.should.have.property("value").eql(
			`${count} ${name} ${maleIndividualCount} ${femaleIndividualCount}`
		);
		last.should.have.property("key").eql(name);
		last.should.have.property("isNonMatching").eql(true);

		last.unit.unitFact.should.not.have.property("autocompleteSelectedTaxonID");
		last.unit.identifications[0].should.have.property("taxon").eql(name);
	});

	it("returns unit for trip report unit autocomplete", async function() {
		let name = "Parus major";
		const params = { count, name, maleIndividualCount, femaleIndividualCount };

		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/trip-report`, { query: Object.keys(params).map(p => params[p]).join(" ") }));
		res.should.have.status(200);

		res.body.results.length.should.be.above(1);

		[first, ...rest] = res.body.results;

		first.should.have.property("matchType").eql("exactMatches");
		first.should.have.property("finnish");
		first.should.have.property("taxonRank");

		rest.every(item => item.should.have.property("matchType").not.eql("exactMatches"));

	});

	it("returns list of correct units for trip report unit list", async function() {
		const correctAnswer = [
			{
				"informalTaxonGroups": [
					"MVL.2"
				],
				"identifications": [
					{
						"taxon": "susi"
					}
				],
				"unitFact": {
					"autocompleteSelectedTaxonID": "MX.46549"
				}
			},
			{
				"informalTaxonGroups": [
					"MVL.2"
				],
				"identifications": [
					{
						"taxon": "kettu"
					}
				],
				"unitFact": {
					"autocompleteSelectedTaxonID": "MX.46587"
				}
			},
			{
				"informalTaxonGroups": [],
				"identifications": [
					{
						"identificationBasis": [],
						"taxon": "wookie"
					}
				],
				"unitFact": {}
			}
		];

		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/list`, { formID: "JX.519", query: "susi,kettu,wookie" }));
		res.should.have.status(200);
		res.body.should.have.property("count").eql(3);
		res.body.should.have.property("nonMatchingCount").eql(1);
		res.body.results.forEach((unit, i) => {
			unit.identifications[0].should.have.property("taxon").eql(
				correctAnswer[i].identifications[0]["taxon"]
			);
			if (i !== 2) {
				unit.unitFact.should.have.property("autocompleteSelectedTaxonID").eql(
					correctAnswer[i].unitFact["autocompleteSelectedTaxonID"]
				);
			}
			unit.should.have.property("informalTaxonGroups").eql(correctAnswer[i]["informalTaxonGroups"]);
		});
	});

	it("return correct pair count for ANAACU", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/water-bird-pair-count`, { taxonID: "MX.26382", query: "3k2n, kn, 3" }));
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body.value.should.eql(4);
		res.body.key.should.eql("3k2n, kn, 3");
	});

	it("return correct pair count for ANSANS", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/water-bird-pair-count`, { taxonID: "MX.26291", query: "3k2n,kn,3,1" }));
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body.value.should.eql(2);
		res.body.key.should.eql("3k2n, kn, 3, 1");
	});

	it("return correct pair count for GALGAL", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/water-bird-pair-count`, { taxonID: "MX.27666", query: "3k2n,kn,n,3,1" }));
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body.value.should.eql(5);
		res.body.key.should.eql("3k2n, kn, n, 3, 1");
	});

	it("return correct pair count for CORNIX", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/water-bird-pair-count`, { taxonID: "MX.73566", query: "k2n,k2n, 5" }));
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body.value.should.eql(5);
		res.body.key.should.eql("k2n, k2n, 5");
	});

	it("return correct pair count for CYGOLO", async function() {
		const query = "2k, n, 2n, 2, 3, 2kn";
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/water-bird-pair-count`, { taxonID: "MX.26277", query }));
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body.value.should.eql(4);
		res.body.key.should.eql("2k, n, 2n, 2, 3, 2kn");
	});

	it("doesn't return pair count for unknown taxon", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/water-bird-pair-count`, { taxonID: "MX.20000", query: "k2n,k2n, 5" }));
		res.should.have.status(200);
		res.body.should.include.keys("key");
		res.body.should.not.have.keys("value");
		res.body.key.should.eql("k2n, k2n, 5");
	});

	it("doesn't return pair count for empty query", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/water-bird-pair-count`, { taxonID: "MX.20000", query: "" }));
		res.should.have.status(200);
		res.body.should.include.keys("key");
		res.body.should.not.have.keys("value");
		res.body.key.should.eql("");
	});

	it("return correct pair count when count is big", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/water-bird-pair-count`, { taxonID: "MX.73566", query: "20k2n,101k2n, 5" }));
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body.value.should.eql(124);
		res.body.key.should.eql("20k2n, 101k2n, 5");
	});

	it("formats waterbird count right", async function() {
		const query = "20n1k4, 5, kk2,3n";
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/water-bird-pair-count`, { taxonID: "MX.73566", query }));
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body.value.should.eql(10);
		res.body.key.should.eql("k20n, 4, 5, k, 2, 3n");
	});

	it("formats empty waterbird count right", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/water-bird-pair-count`, { taxonID: "MX.73566", query: "0,0" }));
		res.should.have.status(200);
		res.body.should.include.keys("key");
		res.body.key.should.eql("");
	});

	it("accepts upper case in waterbird count", async function() {
		const query = "2K, n, 2N, 2, 3, 2Kn";
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/water-bird-pair-count`, { taxonID: "MX.26277", query }));
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body.value.should.eql(4);
		res.body.key.should.eql("2k, n, 2n, 2, 3, 2kn");
	});

	it("accepts dots and converts them to commas in waterbird count", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/water-bird-pair-count`, { taxonID: "MX.26277", query: "2k.n. 3" }));
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body.value.should.eql(2);
		res.body.key.should.eql("2k, n, 3");
	});

	it("returns correct pair count for singing", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/water-bird-pair-count`, { taxonID: "MX.26277", query: "3Ä" }));
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body.value.should.eql(3);
		res.body.key.should.eql("3Ä");
	});

	it("returns correct pair count for uttering", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/unit/water-bird-pair-count`, { taxonID: "MX.26277", query: "3ä" }));
		res.should.have.status(200);
		res.body.should.include.keys("key", "value");
		res.body.value.should.eql(2);
		res.body.key.should.eql("3ä");
	});
});
