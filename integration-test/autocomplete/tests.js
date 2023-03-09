var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

describe("/autocomplete", function() {
	var basePath = config["urls"]["autocomplete"];
	let app;

	before(async () => {
		app = await helpers.init();
	});

	after(async () => {
		await helpers.close();
	});

	it("returns 401 when no access token specified", function(done) {
		request(app)
			.get(basePath + "/taxon")
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns taxons with default size", function(done) {
		var defaultSize = 10;
		var searchWord = "käki";
		var query = basePath + "/taxon" +
			"?access_token=" + config["access_token"];
		request(app)
			.get(query + "&q=" + searchWord)
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
		var query = basePath + "/taxon" +
			"?includePayload=true&access_token=" + config["access_token"];
		request(app)
			.get(query + "&q=VAn%20Van")
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
		var query = basePath + "/taxon" +
			"?includePayload=true&access_token=" + config["access_token"];
		request(app)
			.get(query + "&q=parus&observationMode=true")
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.filter((res) => {
					return res["value"] === "Parus sp.";
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("doesn't return taxons with sp suffix for taxon ranks higher than genum if observationMode is false", function(done) {
		var query = basePath + "/taxon" +
			"?includePayload=true&access_token=" + config["access_token"];
		request(app)
			.get(query + "&q=parus")
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.filter((res) => {
					return res["value"] === "Parus sp.";
				}).should.have.lengthOf(0);
				done();
			});
	});

	it("doesn't return taxons with sp suffix for taxon ranks higher than genum if isn"t scientific name", function(done) {
		var query = basePath + "/taxon" +
			"?includePayload=true&access_token=" + config["access_token"];
		request(app)
			.get(query + "&q=varpus")
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
		if (!config.user.friend_token) {
			this.skip();
		}
		var friend = config["user"]["friend"];
		var query = basePath + "/friends" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.filter((res) => {
					res.should.have.keys("key", "value");
					res["value"].should.not.contain("undefined");
					return res["value"] === friend;
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("returns friends when querying", function(done) {
		if (!config.user.friend_token) {
			this.skip();
		}
		var friend = config["user"]["friend"];
		var query = basePath + "/friends" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&q=" + friend.substring(0,3))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.filter((res) => {
					res.should.have.keys("key", "value");
					res["value"].should.not.contain("undefined");
					return res["value"] === friend;
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("returns friend name and group in payload", function(done) {
		if (!config.user.friend_token) {
			this.skip();
		}
		var friend = config["user"]["friend"];
		var friendGroup = config["user"]["friend_group"];
		var query = basePath + "/friends" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"] + "&includePayload=true";
		request(app)
			.get(query + "&q=" + friend.substring(0,3))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.filter((item) => {
					item.payload.should.have.keys("name", "group");
					return item["value"] === friend && item.payload["group"] === friendGroup;
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("returns line transect unit for line transect form id (MHL.1)", function(done) {
		var query = basePath + "/unit" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];

		request(app)
			.get(query + "&formID=MHL.1&q=llx")
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
		var query = basePath + "/unit" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];

		request(app)
			.get(query + "&formID=MHL.1&q=loxiax")
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
		var query = basePath + "/unit" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];

		request(app)
			.get(query + "&formID=MHL.1&q=loxsp.x")
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
		var query = basePath + "/unit" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];

		request(app)
			.get(query + "&formID=MHL.1&q=loxspx")
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
		var query = basePath + "/unit" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&formID=MHL.1&q=tt13O")
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

	it("O type number is not parsed like pair in line transect unit taxon with taxa that is counted in 5", function(done) {
		var query = basePath + "/unit" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&formID=MHL.1&q=PASDOM17o")
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
		var query = basePath + "/unit" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&formID=MHL.1&q=tt7PARI")
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
		var query = basePath + "/unit" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&formID=MHL.1&q=PASDOM7PARI")
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
				item.should.have.property(prop).eql(value)
		}

		body.every(item => item.should.have.keys("key", "value", "payload"));

		body.every(item => validateProperty(item.payload.interpretedFrom, "taxon", name));
		body.every(item => validateProperty(item.payload.interpretedFrom, "count", count));
		body.every(item => validateProperty(item.payload.interpretedFrom, "maleIndividualCount", `${maleIndividualCount}`));
		body.every(item => validateProperty(item.payload.interpretedFrom, "femaleIndividualCount", `${femaleIndividualCount}`));

		Object.keys({count, maleIndividualCount, femaleIndividualCount}).forEach(prop => {
			body.every(item => validateProperty(item.payload.unit, prop, props[prop]))
		});
	}

	const query = basePath + "/unit" +
		"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
	const name = "Parus major";
	const count = "85";
	const maleIndividualCount = 42;
	const femaleIndividualCount = 43;

	it("return unit payload with taxon data", function(done) {
		const params = {count, name, maleIndividualCount, femaleIndividualCount};

		request(app)
			.get(`${query}&q=${Object.keys(params).map(p => params[p]).join(" ")}&includePayload=true`)
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
		const params = {count, name, maleIndividualCount, femaleIndividualCount};
		const _params =  Object.keys(params).map(param => params[param]);

		request(app)
			.get(`${query}&q=${Object.keys(params).map(p => params[p]).join(" ")}&includePayload=true`)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.length.should.be.above(1);
				validateTripReportPayloadInterpretedFrom(res.body, ..._params);

				done();
			});
	});

	it("parses trip report unit query string correct when count is missing", function(done) {
		const params = {count: undefined, name, maleIndividualCount, femaleIndividualCount};
		const _params =  Object.keys(params).map(param => params[param]);

		request(app)
			.get(`${query}&q=${Object.keys(params).map(p => params[p]).join(" ")}&includePayload=true`)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.length.should.be.above(1);
				validateTripReportPayloadInterpretedFrom(res.body, ..._params);

				done();
			});
	});

	it("parses trip report unit query string correct when taxon is missing", function(done) {
		const params = {count, name: undefined, maleIndividualCount, femaleIndividualCount};
		const _params =  Object.keys(params).map(param => params[param]);

		request(app)
			.get(`${query}&q=${Object.keys(params).map(p => params[p]).join(" ")}&includePayload=true`)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.should.have.lengthOf(0);
				validateTripReportPayloadInterpretedFrom(res.body, ..._params);

				done();
			});
	});

	it("parses trip report unit query string correct when femaleIndividualCount is missing", function(done) {
		const params = {count, name, maleIndividualCount, femaleIndividualCount: undefined};
		const _params =  Object.keys(params).map(param => params[param]);

		request(app)
			.get(`${query}&q=${Object.keys(params).map(p => params[p]).join(" ")}&includePayload=true`)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.length.should.be.above(1);
				validateTripReportPayloadInterpretedFrom(res.body, ..._params);
				done();
			});
	});

	it("parses trip report unit query string correct when maleIndividualCount and femaleIndividualCount are missing", function(done) {
		const params = {count, name, maleIndividualCount: undefined, femaleIndividualCount: undefined};
		const _params =  Object.keys(params).map(param => params[param]);

		request(app)
			.get(`${query}&q=${Object.keys(params).map(p => params[p]).join(" ")}&includePayload=true`)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.length.should.be.above(1);
				validateTripReportPayloadInterpretedFrom(res.body, ..._params);
				done();
			});
	});

	it("parses trip report unit query string correct when count is non numeric", function(done) {
		const params = {count: "many", name, maleIndividualCount: femaleIndividualCount};
		const _params =  Object.keys({...params, count: undefined, name: `many ${name}`}).map(param => params[param])

		request(app)
			.get(`${query}&q=${Object.keys(params).map(p => params[p]).join(" ")}&includePayload=true`)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.should.have.lengthOf(0);
				validateTripReportPayloadInterpretedFrom(res.body, ..._params);
				done();
			});
	});

	it("throws 422 when trip report unit query string femaleIndividualCount is non numeric", function(done) {
		const params = {count, name, maleIndividualCount, femaleIndividualCount: "many"};
		const _params =  Object.keys({...params, femaleIndividualCount: undefined}).map(param => params[param])

		request(app)
			.get(`${query}&q=${Object.keys(params).map(p => params[p]).join(" ")}&includePayload=true`)
			.end(function(err, res) {
				res.should.have.status(422);

				done();
			});
	});

	it("returns the query taxon name as taxon if trip report unit includeNonMatching is true and exact match wasn"t found", function(done) {
		let name = "paarus maajor";
		const params = {count, name, maleIndividualCount, femaleIndividualCount};
		const _params =  Object.keys(params).map(param => params[param]);

		request(app)
			.get(`${query}&q=${Object.keys(params).map(p => params[p]).join(" ")}&includePayload=true&includeNonMatching=true`)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);

				res.body.length.should.be.above(1);
				validateTripReportPayloadInterpretedFrom(res.body, ..._params);

				res.body[res.body.length - 1].should.have.property("value").eql(`${count} ${name} ${maleIndividualCount} ${femaleIndividualCount}`);
				res.body[res.body.length - 1].should.have.property("key").eql(name);
				res.body[res.body.length - 1].payload.should.have.property("isNonMatching").eql(true);

				res.body[res.body.length - 1].payload.unit.unitFact.should.not.have.property("autocompleteSelectedTaxonID");
				res.body[res.body.length - 1].payload.unit.identifications[0].should.have.property("taxon").eql(name);

				done();
			});
	});

	it("doesn't return the query taxon name as taxon if includeNonMatching is true and exact match was found", function(done) {
		let name = "Parus major";
		const params = {count, name, maleIndividualCount, femaleIndividualCount};
		const _params =  Object.keys(params).map(param => params[param]);

		request(app)
			.get(`${query}&q=${Object.keys(params).map(p => params[p]).join(" ")}&includePayload=true&includeNonMatching=true`)
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
		const params = {count, name, maleIndividualCount, femaleIndividualCount};

		request(app)
			.get(`${query}&q=${Object.keys(params).map(p => params[p]).join(" ")}&includePayload=true&includeNonMatching=true`)
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
		const params = {count, name, maleIndividualCount, femaleIndividualCount};

		request(app)
			.get(`${query}&q=${Object.keys(params).map(p => params[p]).join(" ")}&includePayload=true&includeNonMatching=true&observationMode=true`)
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

		var query = basePath + "/unit" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];

		request(app)
			.get(query + "&formID=JX.519&q=susi,kettu,wookie&includePayload=true&list=true")
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value", "payload");
				res.body.payload.should.have.property("count").eql(3);
				res.body.payload.should.have.property("nonMatchingCount").eql(1);
				res.body.payload.units.forEach((unit, i) => {
					unit.identifications[0].should.have.property("taxon").eql(correctAnswer[i].identifications[0]["taxon"]);
					if (i !== 2) {
						unit.unitFact.should.have.property("autocompleteSelectedTaxonID").eql(correctAnswer[i].unitFact["autocompleteSelectedTaxonID"]);
					}
					unit.should.have.property("informalTaxonGroups").eql(correctAnswer[i]["informalTaxonGroups"]);
				});
				done();
			});
	});

	it("return correct pair count for ANAACU", function(done) {
		var query = basePath + "/pairCount" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&taxonID=MX.26382&q=3k2n, kn, 3")
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
		var query = basePath + "/pairCount" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&taxonID=MX.26291&q=3k2n,kn,3,1")
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
		var query = basePath + "/pairCount" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&taxonID=MX.27666&q=3k2n,kn,n,3,1")
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
		var query = basePath + "/pairCount" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&taxonID=MX.73566&q=k2n,k2n, 5")
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value");
				res.body.value.should.eql(2);
				res.body.key.should.eql("k2n, k2n, 5");
				done();
			});
	});
	it("return correct pair count for CYGOLO", function(done) {
		var query = basePath + "/pairCount" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&taxonID=MX.26277&q=2k, n, 2n, 2, 3, 2kn")
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
		var query = basePath + "/pairCount" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&taxonID=MX.20000&q=k2n,k2n, 5")
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
		var query = basePath + "/pairCount" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&taxonID=MX.20000&q=")
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
		var query = basePath + "/pairCount" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&taxonID=MX.73566&q=20k2n,101k2n, 5")
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value");
				res.body.value.should.eql(121);
				res.body.key.should.eql("20k2n, 101k2n, 5");
				done();
			});
	});
	it("formats waterbird count right", function(done) {
		var query = basePath + "/pairCount" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&taxonID=MX.73566&q=20n1k4, 5, kk2,3n")
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key", "value");
				res.body.value.should.eql(2);
				res.body.key.should.eql("k20n, 4, 5, k, 2, 3n");
				done();
			});
	});
	it("formats empty waterbird count right", function(done) {
		var query = basePath + "/pairCount" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&taxonID=MX.73566&q=0,0")
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.keys("key");
				res.body.key.should.eql("");
				done();
			});
	});
	it("accepts upper case in waterbird count", function(done) {
		var query = basePath + "/pairCount" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&taxonID=MX.26277&q=2K, n, 2N, 2, 3, 2Kn")
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
		var query = basePath + "/pairCount" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&taxonID=MX.26277&q=2k.n. 3")
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
		var query = basePath + "/pairCount" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&taxonID=MX.26277&q=3Ä")
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
		var query = basePath + "/pairCount" +
			"?personToken=" + config["user"]["token"] + "&access_token=" + config["access_token"];
		request(app)
			.get(query + "&taxonID=MX.26277&q=3ä")
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
		if (!config.user.model.organisation) {
			this.skip();
		}
		var query = basePath + "/organization" +
			"?personToken=" + config.user.token + "&access_token=" + config.access_token;
		request(app)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.filter((res) => {
					res.should.have.keys("key", "value");
					res.value.should.not.contain("undefined");
					return res["key"] === config.user.model.organisation[0];
				}).should.have.lengthOf(1);
				done();
			});
	});
});
