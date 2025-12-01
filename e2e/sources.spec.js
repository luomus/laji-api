const config = require("./config.json");
const helpers = require("./helpers");
const { apiRequest } = helpers;
const { accessToken } = config;

describe("/sources", function() {

	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server).get("/sources");
		res.should.have.status(401);
	});

	it("returns a page of sources", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get("/sources");

		res.should.have.status(200);
		res.body.should.be.an("object");
		res.body.results.should.be.an("array");
		res.body.results.length.should.be.above(0);
	});

	it("returns the requested source (KE.1) when authenticated", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get("/sources/KE.102");

		res.should.have.status(200);
		res.body.should.be.an("object");

		res.body.should.have.keys("id", "name", "description");
		res.body.should.have.property("id").eql("KE.102");
		res.body.should.have.property("name");
		res.body.should.have.property("description");
	});
});
