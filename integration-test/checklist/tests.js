var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

const itemProperties = [
	"@context",
	"id",
	"owner",
	"isPublic",
	"rootTaxon",
	"dc:bibliographicCitation"
];

describe("/checklists", function() {
	var basePath = config.urls.checklist;

	it("returns 401 when no access token specified", function(done) {
		request(this.server)
			.get(basePath)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns 401 when no access token specified for id", function(done) {
		request(this.server)
			.get(basePath + "/" + config["id"]["checklist"])
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("return only public checklists and has the asked id within", function(done) {
		this.timeout(5000);
		var pageSize = 1000;
		var query = basePath +
			"?pageSize="+ pageSize+"&access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.isPagedResult(res.body, pageSize);
				res.body[helpers.params.results].filter((checklist) => {
					helpers.toHaveOnlyKeys(checklist, itemProperties);
					checklist.should.have.any.keys("id");
					checklist.should.have.any.keys("isPublic");
					checklist.should.include({isPublic: true});

					return checklist["id"] === config["id"]["checklist"];
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("return item with id", function(done) {
		this.timeout(5000);
		var query = basePath + "/" + config.id.checklist +
			"?access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.toHaveOnlyKeys(res.body, itemProperties);
				res.body.should.include({id: config.id.checklist});
				res.body.should.have.any.keys("@context");
				done();
			});
	});
});
