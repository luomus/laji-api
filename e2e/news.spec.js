const config = require("./config.json");
const helpers = require("./helpers");
const { apiRequest } = helpers;
const { accessToken } = config;

describe("/publications", function() {

	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server).get("/news");
		res.should.have.status(401);
	});

	it("GET /news returns page", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get("/news");

		res.should.have.status(200);
		res.body.should.have.property("results");
		const item = res.body.results[0];
		item.should.have.property("title").that.is.a("string");
		item.should.have.property("id").that.is.a("string");
	});

	it("GET /news can be filtered by tag", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get("/news?tag=technical");

		res.should.have.status(200);
		res.body.should.have.property("results");
		res.body.results.forEach(item => {
			item.should.have.property("tag").that.is.equal("technical");
		});
	});

	it("GET /news/:id returns news item", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get("/news/luomus.fi-43270");

		res.should.have.status(200);
		res.body.should.have.property("title").that.is.a("string");
		res.body.should.have.property("id").that.is.a("string");
	});
});
