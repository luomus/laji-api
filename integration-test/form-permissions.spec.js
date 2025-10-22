var config = require("./config.json");
var helpers = require("./helpers");
const { request } = require("chai");
const { url } = helpers;
const { access_token } = config;

const userId = config.person.id;
const adminToken = config.friend2.personToken;

describe("/formPermissions", function() {
	const basePath = "/forms/permissions";
	const collectionID = "HR.2991";

	it("listing permissions for person works", async function() {
		this.timeout(30000); // Collections initial load take a while.
		const res = await request(this.server)
			.get(url(basePath, { access_token, config.friend.personToken }));
		res.should.have.status(200);
	});

	it("listing permissions for collection with person works", async function() {
		this.timeout(30000); // Collections initial load take a while.
		const res = await request(this.server)
			.get(url(`${basePath}/${collectionID}`, { access_token, config.friend.personToken }));
		res.should.have.status(200);
	});

	it("listing permissions for collection without person works", async function() {
		const res = await request(this.server)
			.get(url(`${basePath}/${collectionID}`, { access_token }));
		res.should.have.status(200);
	});

	it("requesting permission works", async function() {
		const res = await request(this.server)
			.post(url(`${basePath}/${collectionID}`, { access_token, personToken: config.friend.personToken }));
				res.body.permissionRequests.should.include(userId);
				res.should.have.status(201);
	});

	it("doesn't allow requesting permission if requested already", async function() {
		const res = await request(this.server)
			.post(url(`${basePath}/${collectionID}`, { access_token, personToken: config.friend.personToken }));
		res.should.have.status(406);
	});

	it("accepting permission works", async function() {
		const res = await request(this.server)
			.put(url(`${basePath}/${collectionID}`, { access_token, personToken: adminToken }));
		res.body.editors.should.include(userId);
		res.body.permissionRequests.should.not.include(userId);
		res.should.have.status(200);
	});

	it("granting admin permission works", async function() {
		const res = await request(this.server)
			.put(url(`${basePath}/${collectionID}/${userId}`, { access_token, personToken: adminToken, type: "admin" }));
		res.body.admins.should.include(userId);
		res.body.editors.should.not.include(userId);
		res.body.permissionRequests.should.not.include(userId);
		res.should.have.status(200);
	});

	it("doesn't allow requesting permission if accepted already", async function() {
		const res = await request(this.server)
			.post(url(`${basePath}/${collectionID}`, { access_token, personToken: config.friend.personToken }));
		res.should.have.status(406);
	});

	it("revoking permission works", async function() {
		const res = await request(this.server)
			.post(url(`${basePath}/${collectionID}/${userId}`, { access_token, personToken: adminToken }));
		res.body.editors.should.not.include(userId);
		res.body.permissionRequests.should.not.include(userId);
		res.should.have.status(200);
	});
});
