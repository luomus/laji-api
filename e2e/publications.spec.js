const config = require("./config.json");
const helpers = require("./helpers");
const { apiRequest } = helpers;
const { accessToken } = config;

describe("/publications", function() {

	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server).get("/publications/MP.2304");
		res.should.have.status(401);
	});

	it("GET /:id returns publication", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get("/publications/MP.2304");

		res.should.have.status(200);
		res.body.should.have.property("id").that.is.a("string");
		res.body.should.have.property("name").that.is.a("string");
		res.body.should.have.property("@context").that.is.a("string");
	});

	it("returns only publications", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get("/publications/MA.308");

		res.should.have.status(404);
	});
});
