const config = require("./config.json");
const helpers = require("./helpers");
const { request } = require("chai");
const { url } = helpers;
const { access_token } = config;

describe("/sound-identification", function() {
	it("POST returns 401 when no access token specified", async function() {
		const res = await request(this.server)
			.post("/sound-identification")
		res.should.have.status(401);
	});

	it("POST proxy works", async function() {
		const res = await request(this.server)
			.post(url("/sound-identification", { access_token }));
		res.should.have.status(422);
	});
});
