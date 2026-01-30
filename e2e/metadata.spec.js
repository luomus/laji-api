const config = require("./config.json");
const helpers = require("./helpers");
const { apiRequest, url } = helpers;
const { accessToken } = config;

describe("/metadata", function() {

	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server).get("/metadata/classes");
		res.should.have.status(401);
	});

	it("GET /classes returns list of classes", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(url("/metadata/classes"));

		res.should.have.status(200);
		res.body.results.should.be.an("array");
		const item = res.body.results[0];
		item.should.have.property("class").that.is.a("string");
		item.should.have.property("label").that.is.a("string");
		item.should.have.property("shortName").that.is.a("string");
	});

	it("GET /classes/:QName returns a single class", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(url("/metadata/classes/MY.document"));

		res.should.have.status(200);
		res.body.should.have.property("class").that.is.a("string");
		res.body.should.have.property("label").that.is.a("string");
		res.body.should.have.property("shortName").that.is.a("string");
	});

	it("GET /classes/:QName/properties returns list of properties", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(url("/metadata/classes/MY.document/properties"));

		res.should.have.status(200);
		res.body.results.should.be.an("array");
		const item = res.body.results[0];
		item.should.have.property("property").that.is.a("string");
		item.should.have.property("label").that.is.a("string");
	});

	it("GET /properties returns list of properties", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(url("/metadata/properties"));

		res.should.have.status(200);
		res.body.results.should.be.an("array");
		const item = res.body.results[0];
		item.should.have.property("property").that.is.a("string");
		const oneWithLabel = res.body.results.find(p => p["label"])
		oneWithLabel.should.have.property("label").that.is.a("string");
	});

	it("GET /properties/:QName returns a single property", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(url("/metadata/properties/MY.dateBegin"));

		res.should.have.status(200);
		res.body.should.have.property("property").that.is.a("string");
		res.body.should.have.property("label").that.is.a("string");
	});

	it("GET /properties/:QName/alt returns alts", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(url("/metadata/properties/MZ.publicityRestrictions/alt"));

		res.should.have.status(200);
		res.body.results.should.be.an("array");
		const item = res.body.results[0];
		item.should.have.property("value").that.is.a("string");
		item.should.have.property("id").that.is.a("string");
	});

	it("GET /alts returns lookup object of alts", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(url("/metadata/alts"));

		res.should.have.status(200);
		res.body.should.be.an("object");

		const keys = Object.keys(res.body);
		keys.length.should.be.above(0);

		const firstAlt = res.body[keys[0]][0];
		firstAlt.should.have.property("value");
		firstAlt.should.have.property("id");
	});

	it("GET /alts/:alt returns single alt translated", async function() {
		const res = await apiRequest(this.server, { accessToken, lang: "fi" })
			.get(url("/metadata/alts/MM.keywordEnum"));

		res.should.have.status(200);
		res.body.should.be.an("object");
		const { results } = res.body;
		results[0].should.be.an("object");
		results[0].should.have.property("value").equal("Laji");
		results[0].should.have.property("id");
	});
});
