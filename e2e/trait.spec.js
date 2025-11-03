var config = require("./config.json");
const helpers = require("./helpers");
const { apiRequest } = helpers;
const { accessToken } = config;

describe("/trait", function() {
	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server)
			.get("/trait/search");
		res.should.have.status(401);
	});

	it("GET proxy works", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get("/trait/search");
		res.should.have.status(200);
	});

	it("POST proxy works", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.post("/trait/rows/validate")
			.send({});
		res.should.have.status(422);
	});
});
