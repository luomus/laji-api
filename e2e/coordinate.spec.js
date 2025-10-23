var config = require("./config.json");
var helpers = require("./helpers");
const { request } = require("chai");

describe("/coordinates", function() {
	it("returns 404 when no access token specified", async function() {
		const res = await request(this.server)
			.get("/coordinates")
		res.should.have.status(404);
	});
});
