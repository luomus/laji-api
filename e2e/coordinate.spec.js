var config = require("./config.json");
var helpers = require("./helpers");
const { request } = require("chai");

describe("/coordinates", function() {
	it("returns 401 when no access token specified", async function() {
		const res = await request(this.server)
			.post("/coordinates/location");
		res.should.have.status(401);
	});
});
