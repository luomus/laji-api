var config = require("./config.json");
var helpers = require("./helpers");
const { apiRequest } = helpers;
const { accessToken } = config;

describe("/html-to-pdf", function() {
	var basePath =  "/html-to-pdf";

	it("returns 401 when no access token specified", async function () {
		const res = await apiRequest(this.server)
			.get(basePath);
		res.should.have.status(401);
	});

	it("returns pdf when given html content", async function () {
		const html = "<br/>";

		const res = await apiRequest(this.server, { accessToken })
			.post(basePath)
			.send(html)
			.set("Content-Type", "text/plain");
		res.should.have.status(200);
		res.header["content-type"].should.be.equal("application/pdf");
	});
});
