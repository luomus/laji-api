var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

const itemProperties = [
	"@context",
	"id",
	"organizationLevel1",
	"organizationLevel2",
	"organizationLevel3",
	"organizationLevel4",
	"abbreviation",
	"fullname"
];

describe("/checklists", function() {
	var basePath = config.urls["organization"];

	it("returns 401 when no access token specified for id", function(done) {
		request(this.server)
			.get(basePath + "/" + config["id"]["organization"])
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns organization", function(done) {
		this.timeout(5000);
		var query = basePath + "/" + config["id"]["organization"] + "?access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.toHaveOnlyKeys(res.body, itemProperties);
				done();
			});
	});
});

