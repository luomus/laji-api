const config = require("./config.json");
const helpers = require("./helpers");
const { apiRequest } = helpers;
const { accessToken } = config;

describe("/red-list-evaluation-groups", function() {

	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server).get("/publications/MP.2304");
		res.should.have.status(401);
	});

	it("GET /:id returns red list evaluation group", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get("/red-list-evaluation-groups/MVL.721");

		res.should.have.status(200);
		res.body.should.have.property("id").that.is.a("string");
		res.body.should.have.property("name").that.is.a("string");
		res.body.should.have.property("includesTaxon");
		res.body.should.have.property("@context").that.is.a("string");
	});

	it("returns only red list evaluation groups", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get("/publications/MA.308");

		res.should.have.status(404);
	});
});
