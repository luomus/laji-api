var config = require("./config.json");
var helpers = require("./helpers");
const { request } = require("chai");
const { url } = helpers;
const { access_token } = config;

describe("/api-user", function() {
	var basePath = "/api-users";

	it("returns 401 when no access token specified", function(done) {
		request(this.server)
			.get(basePath)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns user info", function(done) {
		request(this.server)
			.get(url(basePath, { access_token }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.property("email");
				res.body.should.not.have.property("password");
				res.body.should.not.have.property("id");
				done();
			});
	});

	it("returns error when no email is given", function(done) {
		request(this.server)
			.post(url(basePath, { access_token }))
			.send({})
			.end(function(err, res) {
				res.should.have.status(400);
				done();
			});
	});

});
