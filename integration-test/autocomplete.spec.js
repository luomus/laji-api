var config = require("./config.json");
var helpers = require("./helpers");
const { request } = require("chai");
const { url } = helpers;
const { access_token, personToken } = config;

const friendName = "Unit Tester 1 (Test)";
const friendGroup = "Test";

describe("/autocomplete", function() {
	var basePath = "/autocomplete";

	it("returns 401 when no access token specified", function(done) {
		request(this.server)
			.get(`${basePath}/taxon`)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns taxons with default size", function(done) {
		var defaultSize = 10;
		var searchWord = "käki";
		request(this.server)
			.get(url(`${basePath}/taxon`, { access_token, q: searchWord }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.filter((res) => {
					res.should.have.keys("key", "value");
					return res["value"] === searchWord;
				}).should.have.lengthOf(1);
				res.body.should.have.lengthOf(defaultSize);
				done();
			});
	});

	it("returns taxons with payload", function(done) {
		request(this.server)
			.get(url(`${basePath}/taxon`, { access_token, q: "VAn Van", includePayload: true }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.filter((res) => {
					res.should.have.keys("key", "value", "payload");
					return res["value"] === "Vanellus vanellus";
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("returns taxons with sp suffix for taxon ranks higher than genum if observationMode is true", function(done) {
		request(this.server)
			.get(url(`${basePath}/taxon`, { access_token, q: "parus", includePayload: true, observationMode: true }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.filter((res) => {
					return res["value"] === "Parus sp.";
				}).should.have.lengthOf(1);
				done();
			});
	});

	// eslint-disable-next-line max-len
	it("doesn't return taxons with sp suffix for taxon ranks higher than genum if observationMode is false", function(done) {
		request(this.server)
			.get(url(`${basePath}/taxon`, { access_token, q: "parus", includePayload: true }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.filter((res) => {
					return res["value"] === "Parus sp.";
				}).should.have.lengthOf(0);
				done();
			});
	});

	// eslint-disable-next-line max-len
	it("doesn't return taxons with sp suffix for taxon ranks higher than genum if isn't scientific name", function(done) {
		request(this.server)
			.get(url(`${basePath}/taxon`, { access_token, q: "varpus", includePayload: true }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.filter((res) => {
					return res["value"] === "Parus sp." && res.payload.taxonRankId === "MX.genus";
				}).should.have.lengthOf(0);
				done();
			});
	});

	it("returns friends", function(done) {
		request(this.server)
			.get(url(`${basePath}/friends`, { access_token, personToken }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.filter((res) => {
					res.should.have.keys("key", "value");
					res["value"].should.not.contain("undefined");
					return res["value"] === friendName;
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("returns friends when querying", function(done) {
		request(this.server)
			.get(url(`${basePath}/friends`, { access_token, personToken, q: friendName.substring(0, 3) }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.filter((res) => {
					res.should.have.keys("key", "value");
					res["value"].should.not.contain("undefined");
					return res["value"] === friendName;
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("returns friend name and group in payload", function(done) {
		request(this.server)
			.get(url(`${basePath}/friends`, {
				access_token, personToken,  includePayload: true, q: friendName.substring(0, 3)
			}))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.filter((item) => {
					item.payload.should.have.keys("name", "group");
					return item["value"] === friendName && item.payload["group"] === friendGroup;
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("returns line transect unit for line transect form id (MHL.1)", function(done) {
		request(this.server)
			.get(url(`${basePath}/unit`, { access_token, personToken, formID: "MHL.1", q: "llx" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value", "payload");
				res.body["value"].should.not.contain("undefined");
				res.body.payload.unit.should.have.property("shortHandText").eql("llx");
				res.body.payload.unit.unitFact.should.have.property("autocompleteSelectedTaxonID").eql("MX.32819");
				done();
			});
	});

	it("parses line transect unit taxon correct for loxia", function(done) {
		request(this.server)
			.get(url(`${basePath}/unit`, { access_token, personToken, formID: "MHL.1", q: "loxiax" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value", "payload");
				res.body["value"].should.not.contain("undefined");
				res.body.payload.unit.should.have.property("shortHandText").eql("loxiax");
				res.body.payload.unit.unitFact.should.have.property("autocompleteSelectedTaxonID").eql("MX.36355");
				done();
			});
	});

	it("parses line transect unit taxon correct for loxsp.", function(done) {
		request(this.server)
			.get(url(`${basePath}/unit`, { access_token, personToken, formID: "MHL.1", q: "loxsp.x" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value", "payload");
				res.body["value"].should.not.contain("undefined");
				res.body.payload.unit.should.have.property("shortHandText").eql("loxsp.x");
				res.body.payload.unit.unitFact.should.have.property("autocompleteSelectedTaxonID").eql("MX.36355");
				done();
			});
	});

	it("parses line transect unit taxon correct for loxsp", function(done) {
		request(this.server)
			.get(url(`${basePath}/unit`, { access_token, personToken, formID: "MHL.1", q: "loxspx" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value", "payload");
				res.body["value"].should.not.contain("undefined");
				res.body.payload.unit.should.have.property("shortHandText").eql("loxspx");
				res.body.payload.unit.unitFact.should.have.property("autocompleteSelectedTaxonID").eql("MX.36355");
				done();
			});
	});

	it("O type number is not parsed like pair in line transect unit taxon", function(done) {
		request(this.server)
			.get(url(`${basePath}/unit`, { access_token, personToken, formID: "MHL.1", q: "tt13O" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value", "payload");
				res.body["value"].should.not.contain("undefined");
				res.body.payload.unit.should.have.property("shortHandText").eql("tt13O");
				res.body.payload.unit.should.have.property("pairCount").eql(13);
				res.body.payload.unit.should.have.property("individualCount").eql(13);
				done();
			});
	});

	// eslint-disable-next-line max-len
	it("O type number is not parsed like pair in line transect unit taxon with taxa that is counted in 5", function(done) {
		request(this.server)
			.get(url(`${basePath}/unit`, { access_token, personToken, formID: "MHL.1", q: "PASDOM17o" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value", "payload");
				res.body["value"].should.not.contain("undefined");
				res.body.payload.unit.should.have.property("shortHandText").eql("PASDOM17o");
				res.body.payload.unit.should.have.property("pairCount").eql(17);
				res.body.payload.unit.should.have.property("individualCount").eql(17);
				done();
			});
	});

	it("PARI type multiplier is always 2", function(done) {
		request(this.server)
			.get(url(`${basePath}/unit`, { access_token, personToken, formID: "MHL.1", q: "tt7PARI" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value", "payload");
				res.body["value"].should.not.contain("undefined");
				res.body.payload.unit.should.have.property("shortHandText").eql("tt7PARI");
				res.body.payload.unit.should.have.property("pairCount").eql(7);
				res.body.payload.unit.should.have.property("individualCount").eql(14);
				done();
			});
	});

	it("PARI type multiplier is always 2 even when species is normally multiplied by 5", function(done) {
		request(this.server)
			.get(url(`${basePath}/unit`, { access_token, personToken, formID: "MHL.1", q: "PASDOM7PARI" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value", "payload");
				res.body["value"].should.not.contain("undefined");
				res.body.payload.unit.should.have.property("shortHandText").eql("PASDOM7PARI");
				res.body.payload.unit.should.have.property("pairCount").eql(7);
				res.body.payload.unit.should.have.property("individualCount").eql(14);
				done();
			});
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

		body.every(item => item.should.have.keys("key", "value", "payload"));

		body.every(item => validateProperty(item.payload.interpretedFrom, "taxon", name));
		body.every(item => validateProperty(item.payload.interpretedFrom, "count", count));
		body.every(item => validateProperty(
			item.payload.interpretedFrom, "maleIndividualCount", `${maleIndividualCount}`)
		);
		body.every(item => validateProperty(
			item.payload.interpretedFrom, "femaleIndividualCount", `${femaleIndividualCount}`)
		);

		Object.keys({ count, maleIndividualCount, femaleIndividualCount }).forEach(prop => {
			body.every(item => validateProperty(item.payload.unit, prop, props[prop]));
		});
	}

	const name = "Parus major";
	const count = "85";
	const maleIndividualCount = 42;
	const femaleIndividualCount = 43;

	it("return unit payload with taxon data", function(done) {
		const params = { count, name, maleIndividualCount, femaleIndividualCount };

		request(this.server)
			.get(url(`${basePath}/unit`, {
				access_token,
				personToken,
				q: Object.keys(params).map(p => params[p]).join(" "),
				includePayload: true
			}))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.length.should.be.above(1);

				res.body.every(item => item.payload.unit.unitFact.should.have.property("autocompleteSelectedTaxonID"));
				res.body.every(item => item.payload.unit.identifications[0].should.have.property("taxon"));

				done();
			});
	});

	it("parses trip report unit query string correct when all fields present", function(done) {
		const params = { count, name, maleIndividualCount, femaleIndividualCount };
		const _params =  Object.keys(params).map(param => params[param]);

		request(this.server)
			.get(url(`${basePath}/unit`, {
				access_token,
				personToken,
				q: Object.keys(params).map(p => params[p]).join(" "),
				includePayload: true
			}))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.length.should.be.above(1);
				validateTripReportPayloadInterpretedFrom(res.body, ..._params);

				done();
			});
	});

	it("parses trip report unit query string correct when count is missing", function(done) {
		const params = { count: undefined, name, maleIndividualCount, femaleIndividualCount };
		const _params =  Object.keys(params).map(param => params[param]);

		request(this.server)
			.get(url(`${basePath}/unit`, {
				access_token,
				personToken,
				q: Object.keys(params).map(p => params[p]).join(" "),
				includePayload: true
			}))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.length.should.be.above(1);
				validateTripReportPayloadInterpretedFrom(res.body, ..._params);

				done();
			});
	});

	it("parses trip report unit query string correct when taxon is missing", function(done) {
		const params = { count, name: undefined, maleIndividualCount, femaleIndividualCount };
		const _params =  Object.keys(params).map(param => params[param]);

		request(this.server)
			.get(url(`${basePath}/unit`, {
				access_token,
				personToken,
				q: Object.keys(params).map(p => params[p]).join(" "),
				includePayload: true
			}))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.should.have.lengthOf(0);
				validateTripReportPayloadInterpretedFrom(res.body, ..._params);

				done();
			});
	});

	it("parses trip report unit query string correct when femaleIndividualCount is missing", function(done) {
		const params = { count, name, maleIndividualCount, femaleIndividualCount: undefined };
		const _params =  Object.keys(params).map(param => params[param]);

		request(this.server)
			.get(url(`${basePath}/unit`, {
				access_token,
				personToken,
				q: Object.keys(params).map(p => params[p]).join(" "),
				includePayload: true
			}))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.length.should.be.above(1);
				validateTripReportPayloadInterpretedFrom(res.body, ..._params);
				done();
			});
	});

	// eslint-disable-next-line max-len
	it("parses trip report unit query string correct when maleIndividualCount and femaleIndividualCount are missing", function(done) {
		const params = { count, name, maleIndividualCount: undefined, femaleIndividualCount: undefined };
		const _params =  Object.keys(params).map(param => params[param]);

		request(this.server)
			.get(url(`${basePath}/unit`, {
				access_token,
				personToken,
				q: Object.keys(params).map(p => params[p]).join(" "),
				includePayload: true
			}))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.length.should.be.above(1);
				validateTripReportPayloadInterpretedFrom(res.body, ..._params);
				done();
			});
	});

	it("parses trip report unit query string correct when count is non numeric", function(done) {
		const params = { count: "many", name, maleIndividualCount: femaleIndividualCount };
		const _params =  Object.keys({ ...params, count: undefined, name: `many ${name}` }).map(param => params[param]);

		request(this.server)
			.get(url(`${basePath}/unit`, {
				access_token,
				personToken,
				q: Object.keys(params).map(p => params[p]).join(" "),
				includePayload: true
			}))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.should.have.lengthOf(0);
				validateTripReportPayloadInterpretedFrom(res.body, ..._params);
				done();
			});
	});

	it("throws 422 when trip report unit query string femaleIndividualCount is non numeric", function(done) {
		const params = { count, name, maleIndividualCount, femaleIndividualCount: "many" };

		request(this.server)
			.get(url(`${basePath}/unit`, {
				access_token,
				personToken,
				q: Object.keys(params).map(p => params[p]).join(" "),
				includePayload: true
			}))
			.end(function(err, res) {
				res.should.have.status(422);

				done();
			});
	});

	// eslint-disable-next-line max-len
	it("returns the query taxon name as taxon if trip report unit includeNonMatching is true and exact match wasn't found", function(done) {
		let name = "paarus maajor";
		const params = { count, name, maleIndividualCount, femaleIndividualCount };
		const _params =  Object.keys(params).map(param => params[param]);

		request(this.server)
			.get(url(`${basePath}/unit`, {
				access_token,
				personToken,
				q: Object.keys(params).map(p => params[p]).join(" "),
				includePayload: true,
				includeNonMatching: true
			}))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.length.should.be.above(1);
				validateTripReportPayloadInterpretedFrom(res.body, ..._params);

				const last = res.body[res.body.length - 1];

				last.should.have.property("value").eql(
					`${count} ${name} ${maleIndividualCount} ${femaleIndividualCount}`
				);
				last.should.have.property("key").eql(name);
				last.payload.should.have.property("isNonMatching").eql(true);

				last.payload.unit.unitFact.should.not.have.property("autocompleteSelectedTaxonID");
				last.payload.unit.identifications[0].should.have.property("taxon").eql(name);

				done();
			});
	});

	// eslint-disable-next-line max-len
	it("doesn't return the query taxon name as taxon if includeNonMatching is true and exact match was found", function(done) {
		let name = "Parus major";
		const params = { count, name, maleIndividualCount, femaleIndividualCount };
		const _params =  Object.keys(params).map(param => params[param]);

		request(this.server)
			.get(url(`${basePath}/unit`, {
				access_token,
				personToken,
				q: Object.keys(params).map(p => params[p]).join(" "),
				includePayload: true,
				includeNonMatching: true
			}))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.length.should.be.above(1);
				validateTripReportPayloadInterpretedFrom(res.body, ..._params);

				res.body[res.body.length - 1].payload.should.not.have.property("isNonMatching");

				res.body[res.body.length - 1].payload.unit.unitFact.should.have.property("autocompleteSelectedTaxonID");
				res.body[res.body.length - 1].payload.unit.identifications[0].should.have.property("taxon");

				done();
			});
	});

	it("returns unit payload for trip report unit autocomplete", function(done) {
		let name = "Parus major";
		const params = { count, name, maleIndividualCount, femaleIndividualCount };

		request(this.server)
			.get(url(`${basePath}/unit`, {
				access_token,
				personToken,
				q: Object.keys(params).map(p => params[p]).join(" "),
				includePayload: true,
				includeNonMatching: true
			}))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.length.should.be.above(1);

				[first, ...rest] = res.body;

				first["payload"].should.have.property("matchType").eql("exactMatches");
				first["payload"].should.have.property("finnish");
				first["payload"].should.have.property("taxonRankId");

				rest.every(item => item["payload"].should.have.property("matchType").not.eql("exactMatches"));

				done();
			});
	});

	it("observationMode works for unit autocomplete", function(done) {
		let name = "Parus";
		const params = { count, name, maleIndividualCount, femaleIndividualCount };

		request(this.server)
			.get(url(`${basePath}/unit`, {
				access_token,
				personToken,
				q: Object.keys(params).map(p => params[p]).join(" "),
				includePayload: true,
				includeNonMatching: true,
				observationMode: true
			}))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.length.should.be.above(1);

				res.body.filter(item => {
					return item.value === `${count} Parus sp. ${maleIndividualCount} ${femaleIndividualCount}`;
				}).should.have.lengthOf(1);

				done();
			});
	});

	it("returns list of correct units for trip report unit list", function(done) {
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


		request(this.server)
			.get(url(`${basePath}/unit`, {
				access_token,
				personToken,
				formID: "JX.519",
				q: "susi,kettu,wookie",
				includePayload: true,
				list: true
			}))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value", "payload");
				res.body.payload.should.have.property("count").eql(3);
				res.body.payload.should.have.property("nonMatchingCount").eql(1);
				res.body.payload.units.forEach((unit, i) => {
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
				done();
			});
	});

	it("return correct pair count for ANAACU", function(done) {
		request(this.server)
			.get(url(`${basePath}/pairCount`, { access_token, personToken, taxonID: "MX.26382", q: "3k2n, kn, 3" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value");
				res.body.value.should.eql(4);
				res.body.key.should.eql("3k2n, kn, 3");
				done();
			});
	});

	it("return correct pair count for ANSANS", function(done) {
		request(this.server)
			.get(url(`${basePath}/pairCount`, { access_token, personToken, taxonID: "MX.26291", q: "3k2n,kn,3,1" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value");
				res.body.value.should.eql(2);
				res.body.key.should.eql("3k2n, kn, 3, 1");
				done();
			});
	});

	it("return correct pair count for GALGAL", function(done) {
		request(this.server)
			.get(url(`${basePath}/pairCount`, { access_token, personToken, taxonID: "MX.27666", q: "3k2n,kn,n,3,1" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value");
				res.body.value.should.eql(5);
				res.body.key.should.eql("3k2n, kn, n, 3, 1");
				done();
			});
	});

	it("return correct pair count for CORNIX", function(done) {
		request(this.server)
			.get(url(`${basePath}/pairCount`, { access_token, personToken, taxonID: "MX.73566", q: "k2n,k2n, 5" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value");
				res.body.value.should.eql(5);
				res.body.key.should.eql("k2n, k2n, 5");
				done();
			});
	});

	it("return correct pair count for CYGOLO", function(done) {
		const q = "2k, n, 2n, 2, 3, 2kn";
		request(this.server)
			.get(url(`${basePath}/pairCount`, { access_token, personToken, taxonID: "MX.26277", q }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value");
				res.body.value.should.eql(4);
				res.body.key.should.eql("2k, n, 2n, 2, 3, 2kn");
				done();
			});
	});

	it("doesn't return pair count for unknown taxon", function(done) {
		request(this.server)
			.get(url(`${basePath}/pairCount`, { access_token, personToken, taxonID: "MX.20000", q: "k2n,k2n, 5" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key");
				res.body.should.not.have.keys("value");
				res.body.key.should.eql("k2n, k2n, 5");
				done();
			});
	});

	it("doesn't return pair count for empty query", function(done) {
		request(this.server)
			.get(url(`${basePath}/pairCount`, { access_token, personToken, taxonID: "MX.20000", q: "" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key");
				res.body.should.not.have.keys("value");
				res.body.key.should.eql("");
				done();
			});
	});

	it("return correct pair count when count is big", function(done) {
		request(this.server)
			.get(url(`${basePath}/pairCount`, { access_token, personToken, taxonID: "MX.73566", q: "20k2n,101k2n, 5" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value");
				res.body.value.should.eql(124);
				res.body.key.should.eql("20k2n, 101k2n, 5");
				done();
			});
	});

	it("formats waterbird count right", function(done) {
		const q = "20n1k4, 5, kk2,3n";
		request(this.server)
			.get(url(`${basePath}/pairCount`, { access_token, personToken, taxonID: "MX.73566", q }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value");
				res.body.value.should.eql(10);
				res.body.key.should.eql("k20n, 4, 5, k, 2, 3n");
				done();
			});
	});

	it("formats empty waterbird count right", function(done) {
		request(this.server)
			.get(url(`${basePath}/pairCount`, { access_token, personToken, taxonID: "MX.73566", q: "0,0" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key");
				res.body.key.should.eql("");
				done();
			});
	});

	it("accepts upper case in waterbird count", function(done) {
		const q = "2K, n, 2N, 2, 3, 2Kn";
		request(this.server)
			.get(url(`${basePath}/pairCount`, { access_token, personToken, taxonID: "MX.26277", q }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value");
				res.body.value.should.eql(4);
				res.body.key.should.eql("2k, n, 2n, 2, 3, 2kn");
				done();
			});
	});

	it("accepts dots and converts them to commas in waterbird count", function(done) {
		request(this.server)
			.get(url(`${basePath}/pairCount`, { access_token, personToken, taxonID: "MX.26277", q: "2k.n. 3" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value");
				res.body.value.should.eql(2);
				res.body.key.should.eql("2k, n, 3");
				done();
			});
	});

	it("returns correct pair count for singing", function(done) {
		request(this.server)
			.get(url(`${basePath}/pairCount`, { access_token, personToken, taxonID: "MX.26277", q: "3Ä" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value");
				res.body.value.should.eql(3);
				res.body.key.should.eql("3Ä");
				done();
			});
	});

	it("returns correct pair count for uttering", function(done) {
		request(this.server)
			.get(url(`${basePath}/pairCount`, { access_token, personToken, taxonID: "MX.26277", q: "3ä" }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value");
				res.body.value.should.eql(2);
				res.body.key.should.eql("3ä");
				done();
			});
	});

	it("returns organizations", function(done) {
		request(this.server)
			.get(url(`${basePath}/organization`, { access_token, personToken }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.filter((res) => {
					res.should.have.keys("key", "value");
					res.value.should.not.contain("undefined");
					return res["key"] === "MOS.1016";
				}).should.have.lengthOf(1);
				done();
			});
	});
});
