var config = require("../config.json");
require("../helpers");
const { request } = require("chai");

describe("/trait", function() {
	var basePath = config.urls.trait;

	it("returns 401 when no access token specified", function(done) {
		const url = basePath + "/search";
		request(this.server)
			.get(url)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("GET proxy works", function(done) {
		const url = basePath + "/search"
			+ "?access_token=" + config.access_token;
		request(this.server)
			.get(url)
			.end(function(err, res) {
				res.should.have.status(200);
				done();
			});
	});

	it("POST proxy works", function(done) {
		const url = basePath + "/rows/validate"
			+ "?access_token=" + config.access_token;
		request(this.server)
			.post(url)
			.send({})
			.end(function(err, res) {
				res.should.have.status(422);
				done();
			});
	});
});
