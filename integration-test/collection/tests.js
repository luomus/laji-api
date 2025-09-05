var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

const itemProperties = [
	"@context",
	"longName",
	"hasChildren",
	"id",
	"dateEdited",
	"dateCreated",
	"owner",
	"abbreviation",
	"collectionName",
	"collectionType",
	"contactEmail",
	"description",
	"taxonomicCoverage",
	"notes",
	"geographicCoverage",
	"coverageBasis",
	"methods",
	"temporalCoverage",
	"intellectualRights",
	"publicationTerms",
	"publicationDescription",
	"dataQuarantinePeriod",
	"concealmentBasis",
	"collectionSize",
	"digitizedSize",
	"personResponsible",
	"citation",
	"onlineUrl",
	"dataQuality",
	"collectionQuality",
	"metadataCreator",
	"metadataStatus",
	"typesSize",
	"intellectualOwner",
	"intellectualDescription",
	"publicityRestrictions",
	"language",
	"editNotes",
	"isPartOf",
	"secureLevel",
	"downloadRequestHandler",
	"dataQualityDescription",
	"dataUseTerms",
	"publisherShortname",
	"shareToGbif",
	"institutionCode",
	"collectionCode",
	"shareToFEO",
];

const excludedKeys = ["collectionLocation", "dataLocation", "inMustikka", "editor", "creator"]

describe("/collections", function() {
	var basePath = config.urls.collection;

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
			.get(basePath + "/" + config.id.collection)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("return only public collections and has the specified id within", function(done) {
		this.timeout(30000); // Collections initial load take a while.
		var pageSize = 1000;
		var query = basePath +
			"?pageSize="+ pageSize+"&access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.isPagedResult(res.body, pageSize);
				res.body[helpers.params.results].filter((collection) => {
					collection.should.include.keys("id");
					collection.should.not.have.keys(...excludedKeys);
					collection.should.not.include({metadataStatus: "MY.metadataStatusHidden"});

					return collection["id"] === config.id.collection;
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("return item with id", function(done) {
		var query = basePath + "/" + config.id.collection +
			"?access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.toHaveOnlyKeys(res.body, itemProperties);
				res.body.should.have.any.keys("@context");
				res.body.should.include({id: config.id.collection});
				done();
			});
	});

	it("returns children item with id", function(done) {
		var query = basePath + "/" + config.id.collection_parent + "/children" +
			"?access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.isPagedResult(res.body);
				res.body.results.filter((collection) => {
					collection.should.not.have.keys(...excludedKeys);
					collection.should.not.include({id: config.id.collection_parent});
					collection.should.not.include({id: config.id.collection_root});
					return collection.id === config.id.collection
				}).should.have.lengthOf(1);
				res.body.should.have.any.keys("@context");
				done();
			});
	});

	it("returns roots", function(done) {
		var query = basePath + "/roots" +
			"?pageSize=400&access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.isPagedResult(res.body);
				res.body.results.filter((collection) => {
					collection.should.not.have.keys(...excludedKeys);
					collection.should.not.include({id: config.id.collection_parent});
					collection.should.not.include({id: config.id.collection});
					return collection.id === config.id.collection_root
				}).should.have.lengthOf(1);
				res.body.should.have.any.keys("@context");
				done();
			});
	});
});
