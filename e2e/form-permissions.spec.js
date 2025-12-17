var config = require("./config.json");
var helpers = require("./helpers");
const { apiRequest, url } = helpers;
const { accessToken, friend, friend2 } = config;

const adminToken = friend2.personToken;

describe("/form-permissions", function() {
	const basePath = "/form-permissions";
	const collectionID = "HR.2991";

	it("listing permissions for person works", async function() {
		this.timeout(30000); // Collections initial load take a while.
		const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
			.get(basePath);
		res.should.have.status(200);
	});

	it("listing permissions for collection with person works", async function() {
		this.timeout(30000); // Collections initial load take a while.
		const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
			.get(`${basePath}/${collectionID}`);
		res.should.have.status(200);
	});

	it("listing permissions for collection without person works", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(`${basePath}/${collectionID}`);
		res.should.have.status(200);
	});

	it("requesting permission works", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
			.post(`${basePath}/${collectionID}`);
		res.body.permissionRequests.should.include(friend.id);
		res.should.have.status(201);
	});

	it("doesn't allow requesting permission if requested already", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
			.post(`${basePath}/${collectionID}`);
		res.should.have.status(406);
	});

	it("accepting permission works", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken: adminToken })
			.put(`${basePath}/${collectionID}/${friend.id}`);
		res.body.editors.should.include(friend.id);
		res.body.permissionRequests.should.not.include(friend.id);
		res.should.have.status(200);
	});

	it("granting admin permission works", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken: adminToken })
			.put(url(`${basePath}/${collectionID}/${friend.id}`, { type: "admin" }));
		res.body.admins.should.include(friend.id);
		res.body.editors.should.not.include(friend.id);
		res.body.permissionRequests.should.not.include(friend.id);
		res.should.have.status(200);
	});

	it("doesn't allow requesting permission if accepted already", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
			.post(`${basePath}/${collectionID}`);
		res.should.have.status(406);
	});

	it("revoking permission works", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken: adminToken })
			.delete(`${basePath}/${collectionID}/${friend.id}`);
		res.body.editors.should.not.include(friend.id);
		res.body.permissionRequests.should.not.include(friend.id);
		res.should.have.status(200);
	});
});
