var config = require("../config.json");
require("../helpers");
const { request } = require("chai");

describe("/taxa", function() {
	var basePath = config.urls.taxa;

	it("returns 401 when no access token specified", async function() {
		const url = basePath + "/search";
		const res = await request(this.server).get(url).set("API-Version", "1");
		res.should.have.status(401);
	});

	it("GET /search", function() {
		it("respects pageSize and page item looks like a taxon and is translated (lang should be en by default)", async function() {
			const url = `${basePath}?access_token=${config.access_token}&pageSize=1`;
			const res = await request(this.server).get(url).set("API-version", "1");
			res.should.have.status(200);
			res.body.results.should.have.lengthOf(1);
			// Just test it has some keys that is should have. It's not an exhaustive list.
			res.body.results[0].should.have.keys(["intellectualRights", "occurrences", "parent", "hasLatestRedListEvaluation"]);
			// There are more multilang keys but no need to test them all. They're not hard coded.
			res.body.results[0].should.have.property("vernacularName").that.is.a("string");
			res.body.results[0].parent.domain.should.have.property("vernacularName").that.is.a("string");
		});
	});


	it("GET / (get page)", function() {
		it("respects pageSize and page item looks like a taxon and is translated (lang should be en by default)", async function() {
			const url = `${basePath}?access_token=${config.access_token}&pageSize=1`;
			const res = await request(this.server).get(url).set("API-Version", "1");
			res.should.have.status(200);
			res.body.results.should.have.lengthOf(1);
			// Just test it has some keys that is should have. It's not an exhaustive list.
			res.body.results[0].should.have.keys(["intellectualRights", "occurrences", "parent", "hasLatestRedListEvaluation"]);
			// There are more multilang keys but no need to test them all. They're not hard coded.
			res.body.results[0].should.have.property("vernacularName").that.is.a("string");
			res.body.results[0].parent.domain.should.have.property("vernacularName").that.is.a("string");
		});
	});

	it("POST / (get page with filters)", function() {
		it("respects filters", async function() {
			const url = `${basePath}?access_token=${config.access_token}&pageSize=10`;
			const res = await request(this.server).post(url).send({ sensitive: true }).set("API-Version", "1");
			res.should.have.status(200);
			res.body.results.should.have.lengthOf(10);
			res.body.results.forEach(taxon => taxon.should.have.property("sensitive").eql(true));
		});
	});

	it("GET /aggregate", async function() {
		const url = `${basePath}/aggregate?aggregateBy=latestRedListEvaluation.threatenedAtArea,redListEvaluationGroups=a&aggregateSize\=2&access_token=${config.access_token}`;
		const res = await request(this.server).get(url).set("API-Version", "1");
		res.should.have.status(200);
		// Just test it has some keys that it should have. It's not an exhaustive list.
		res.body.should.have.keys(["a"]);
		res.body.a.should.have.lengthOf(4);
		res.body.a[0].should.have.keys(["values", "count"]);
		res.body.a[0].values.should.have.keys(["latestRedListEvaluation.threatenedAtArea", "redListEvaluationGroups"]);
	});

	it("GET /species returns species and is translated and respects informalTaxonGroups", async function() {
		const url = `${basePath}/species?informalTaxonGroups=MVL.1&access_token=${config.access_token}`;
		const res = await request(this.server).get(url).set("API-Version", "1");
		res.should.have.status(200);
		res.body.results.should.have.length.greaterThan(1);
		res.body.results.forEach(taxon => {
			taxon.should.have.property("taxonRank").oneOf(["MX.species", "MX.subspecies"])
			taxon.informalTaxonGroups.should.include("MVL.1");
		});
	});

	it("POST / (get page with filters)", function() {
		it("respects filters", async function() {
			const url = `${basePath}/species?access_token=${config.access_token}&pageSize=10`;
			const res = await request(this.server).post(url).send({ sensitive: true }).set("API-Version", "1");
			res.should.have.status(200);
			res.body.results.should.have.lengthOf(10);
			res.body.results.forEach(taxon => taxon.should.have.property("sensitive").eql(true));
		});
	});

	it("GET /:id", async function() {
		const url = `${basePath}/MX.37600?selectedFields=id,hasChildren&access_token=${config.access_token}`;
		const res = await request(this.server).get(url).set("API-Version", "1");
		res.should.have.status(200);
		res.body.should.have.keys(["hasChildren", "id", "intellectualRights", "@context"]);
		res.body.id.should.equal("MX.37600");
	});

	it("GET /:id/children", async function() {
		const url = `${basePath}/MX.37600/children?selectedFields=id,hasChildren&access_token=${config.access_token}`;
		const res = await request(this.server).get(url).set("API-Version", "1");
		res.should.have.status(200);
		res.body.results.should.have.length.greaterThan(1);
		res.body.results.every(item => item.should.have.keys(["hasChildren", "id", "intellectualRights", "nameAccordingTo"]));
	});

	describe("GET /:id/parents", function() {
		it("empty for biota", async function() {
			const url = `${basePath}/MX.37600/parents?selectedFields=id,hasChildren&access_token=${config.access_token}`;
			const res = await request(this.server).get(url).set("API-Version", "1");
			res.should.have.status(200);
			res.body.results.should.have.lengthOf(0);
		});

		it("returns lineage for kettu and respects selectedFields", async function() {
			const url = `${basePath}/MX.46587/parents?selectedFields=id,hasChildren&access_token=${config.access_token}`;
			const res = await request(this.server).get(url).set("API-Version", "1");
			res.should.have.status(200);
			res.body.results.should.have.length.greaterThan(1);
			res.body.results.every(item => item.should.have.keys(["hasChildren", "id", "intellectualRights"]));
			res.body.results[0].id === "MX.37600"; // Biota
			res.body.results[res.body.results.length - 1].id === "MX.51126"; // Ketut
		});
	});

	describe("GET /:id/descriptions", function() {
		it("descriptions and is translated", async function() {
			const url = `${basePath}/MX.46587/descriptions?access_token=${config.access_token}`;
			const res = await request(this.server).get(url).set("API-Version", "1");
			res.should.have.status(200);
			res.body.results.should.have.length.greaterThan(1);
			res.body.results[0].should.have.property("title").that.is.a("string");
			res.body.results[0].groups[0].variables[0].should.have.property("title").that.is.a("string");
		});

		it("returns empty result if no descriptions", async function() {
			const url = `${basePath}/MX.37600/descriptions?access_token=${config.access_token}`;
			const res = await request(this.server).get(url).set("API-Version", "1");
			res.should.have.status(200);
			res.body.results.should.eql([]);
		});
	});

	it("GET /:id/media returns media and is translated", async function() {
		const url = `${basePath}/MX.46587/media?access_token=${config.access_token}`;
		const res = await request(this.server).get(url).set("API-Version", "1");
		res.should.have.status(200);
		res.body.results.should.have.length.greaterThan(1);
		res.body.results[0].taxon.should.have.property("vernacularName").that.is.a("string");
	});

	it("GET /:id/species returns species and is translated", async function() {
		const url = `${basePath}/MX.50545/species?access_token=${config.access_token}`;
		const res = await request(this.server).get(url).set("API-Version", "1");
		res.should.have.status(200);
		res.body.results.should.have.length.greaterThan(1);
		res.body.results.every(taxon => {
			taxon.should.have.property("taxonRank").eql("MX.species")
			taxon.should.have.property("vernacularName").that.is.a("string");
		});
	});
});
