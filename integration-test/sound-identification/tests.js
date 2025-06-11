var config = require("../config.json");
require("../helpers");
const { request } = require("chai");

describe("/sound-identification", function() {
	var basePath = config.urls["sound-identification"];

	it("POST returns 401 when no access token specified", function(done) {
		request(this.server)
			.post(basePath)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});


	it("POST returns 400 when no personToken specified", function(done) {
    const url = basePath
      + "?access_token=" + config.access_token;
		request(this.server)  
			.post(url)
			.end(function(err, res) {
				res.should.have.status(400);
				done();
			});
	});

	it("POST proxy works", function(done) {
    const url = basePath
      + "?access_token=" + config.access_token
      + "&personToken=" + config.user.token;
		request(this.server)
			.post(url)
			.end(function(err, res) {
				res.should.have.status(422);
				done();
			});
	});
});
