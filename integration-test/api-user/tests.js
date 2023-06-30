var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

describe("/api-user", function() {
	var basePath = config["urls"]["api-user"];

	it("only have the specific remove methods", function(done) {
		var query = config["urls"]["swagger"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.property("paths");
				var paths = res.body.paths;
				var keys = Object.keys(paths).filter((key) => {
					return key.indexOf("/api-users") === 0;
				});
				keys.should.have.lengthOf(2);
				paths["/api-users"].should.have.all.keys("post", "get", "delete");
				paths["/api-users/renew"].should.have.all.keys("post");
				done();
			});
	});

	it("returns 401 when no access token specified", function(done) {
		request(this.server)
			.get(basePath)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns user info", function(done) {
		var query = basePath +
			"?access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.property("email");
				done();
			});
	});

	it("returns error when no email is given", function(done) {
		var query = basePath + "?access_token=" + config["access_token"];
		request(this.server)
			.post(query)
			.send({})
			.end(function(err, res) {
				res.should.have.status(422);
				done();
			});
	});

});
