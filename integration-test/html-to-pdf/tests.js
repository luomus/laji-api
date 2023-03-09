var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

describe("/html-to-pdf", function() {
	var basePath = config.urls["html-to-pdf"];

	let app;

	before(async () => {
		app = await helpers.init();
	});

	after(async () => {
		await helpers.close();
	});

	it("returns 404 when no access token specified", function (done) {
		request(app)
			.get(basePath)
			.end(function (err, res) {
				res.should.have.status(404);
				done();
			});
	});

	it("returns pdf when given html content", function (done) {
		var query = basePath +
			"?access_token=" + config["access_token"];
		const html = "<br/>";

		request(app)
			.post(query)
			.send(html)
			.set("Content-Type", "text/plain")
			.end(function (err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.header["content-type"].should.be.equal("application/pdf");
				done();
			});
	});
});
