var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

const userId = config["user"]["friend_id"];
const adminToken = config["user"]["friend2_token"];

describe("/formPermissions", function() {
	let app;

	before(async () => {
		app = await helpers.init();
	});

	after(async () => {
		await helpers.close();
	});

	const basePath = `${config["urls"]["form-permission"]}`;
	const collectionID = "HR.2991";

	it("listing permissions for person works", function(done) {
		const query = basePath
			+ "?access_token=" + config["access_token"]
			+ "&personToken=" + config["user"]["friend_token"];
		request(app)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(200);
				done();
			});
	});

	it("listing permissions for collection works", function(done) {
		const query = `${basePath}/${collectionID}`
			+ "?access_token=" + config["access_token"]
			+ "&personToken=" + config["user"]["friend_token"];
		request(app)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(200);
				done();
			});
	});

	it("requesting permission works", function(done) {
		const query = `${basePath}/${collectionID}`
			+ "?access_token=" + config["access_token"]
			+ "&personToken=" + config["user"]["friend_token"];
		request(app)
			.post(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.body.permissionRequests.should.include(userId);
				res.should.have.status(200);
				done();
			});
	});

	it("doesn't allow requesting permission if requested already", function(done) {
		const query = `${basePath}/${collectionID}`
			+ "?access_token=" + config["access_token"]
			+ "&personToken=" + config["user"]["friend_token"];
		request(app)
			.post(query)
			.end(function(err, res) {
				res.should.have.status(406);
				done();
			});
	});

	it("accepting permission works", function(done) {
		const query = `${basePath}/${collectionID}`
			+ "/" + userId
			+ "?access_token=" + config["access_token"]
			+ "&personToken=" + adminToken;
		request(app)
			.put(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.body.editors.should.include(userId);
				res.body.permissionRequests.should.not.include(userId);
				res.should.have.status(200);
				done();
			});
	});

	it("granting admin permission works", function(done) {
		const query = `${basePath}/${collectionID}`
			+ "/" + userId
			+ "?access_token=" + config["access_token"]
			+ "&personToken=" + adminToken
			+ "&type=admin";
		request(app)
			.put(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.body.admins.should.include(userId);
				res.body.editors.should.not.include(userId);
				res.body.permissionRequests.should.not.include(userId);
				res.should.have.status(200);
				done();
			});
	});

	it("doesn't allow requesting permission if accepted already", function(done) {
		const query = `${basePath}/${collectionID}`
			+ "?access_token=" + config["access_token"]
			+ "&personToken=" + config["user"]["friend_token"];
		request(app)
			.post(query)
			.end(function(err, res) {
				res.should.have.status(406);
				done();
			});
	});

	it("revoking permission works", function(done) {
		const query = `${basePath}/${collectionID}`
			+ "/" + userId
			+ "?access_token=" + config["access_token"]
			+ "&personToken=" + adminToken;
		request(app)
			.delete(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.body.editors.should.not.include(userId);
				res.body.permissionRequests.should.not.include(userId);
				res.should.have.status(200);
				done();
			});
	});

});
