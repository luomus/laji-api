const config = require("./config.json");
const helpers = require("./helpers");
const { apiRequest } = helpers;
const { accessToken } = config;

describe("/sound-identification", function() {
	// it("POST returns 401 when no access token specified", async function() {
	// 	const res = await apiRequest(this.server)
	// 		.post("/sound-identification");
	// 	res.should.have.status(401);
	// });

	it("POST proxy works", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.post("/sound-identification");
		res.should.have.status(422);
	});
});
