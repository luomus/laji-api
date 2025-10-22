var config = require("./config.json");
var helpers = require("./helpers");
const { request } = require("chai");
const { url } = helpers;
const { access_token } = config;

describe("/html-to-pdf", function() {
	var basePath =  "/html-to-pdf";

	it("returns 404 when no access token specified", async function () {
		const res = await request(this.server)
			.get(basePath);
		res.should.have.status(404);
	});

	it("returns pdf when given html content", async function () {
		const html = "<br/>";

		const res = await request(this.server)
			.post(url(basePath, { access_token }))
			.send(html)
			.set("Content-Type", "text/plain");
		res.should.have.status(200);
		res.header["content-type"].should.be.equal("this.application/pdf");
	});
});
