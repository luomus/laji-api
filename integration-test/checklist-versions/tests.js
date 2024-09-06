var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

const itemProperties = [
	"@context",
	"id",
	"versionChecklist",
	"versionName",
	"rootTaxon",
];

describe("/checklists", function() {
	var basePath = config.urls["checklist-version"];

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
			.get(basePath + "/" + config["id"]["checklist-version"])
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns page", function(done) {
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
				res.body[helpers.params.results].filter((checklistVersion) => {
					helpers.toHaveOnlyKeys(checklistVersion, itemProperties);
					return checklistVersion["id"] === config["id"]["checklist_version"];
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("return item with id", function(done) {
		this.timeout(5000);
		var query = basePath + "/" + config.id.checklist_version +
			"?access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.toHaveOnlyKeys(res.body, itemProperties);
				res.body.should.include({id: config.id.checklist_version});
				res.body.should.have.any.keys("@context");
				done();
			});
	});
});
