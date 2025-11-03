const config = require("./config.json");
const helpers = require("./helpers");
const { request } = require("chai");
const { url } = helpers;
const { access_token } = config;

const excludedKeys = ["collectionLocation", "dataLocation", "inMustikka", "editor", "creator"];

describe("/collections", function() {
	const basePath = "/collections";
	const collectionId = "HR.42";
	const collectionParentId = "HR.160";
	const collectionRootId = "HR.128";

	it("returns 401 when no access token specified", async function() {
		const res = await request(this.server).get(basePath);
		res.should.have.status(401);
	});

	it("returns 401 when no access token specified for id", async function() {
		const res = await request(this.server).get(`${basePath}/${collectionId}`);
		res.should.have.status(401);
	});

	it("return only public collections and has the specified id within", async function() {
		this.timeout(30000); // Collections initial load take a while.
		const pageSize = 1000;
		const res = await request(this.server)
			.get(url(basePath, { pageSize, access_token }));
		res.should.have.status(200);
		helpers.isPagedResult(res.body, pageSize);
		res.body[helpers.params.results].filter((collection) => {
			collection.should.include.keys("id");
			collection.should.not.have.keys(...excludedKeys);
			collection.should.not.include({ metadataStatus: "MY.metadataStatusHidden" });

			return collection["id"] === collectionId;
		}).should.have.lengthOf(1);
	});

	it("return item with id", async function() {
		const res = await request(this.server)
			.get(url(`${basePath}/${collectionId}`, { access_token }));
		res.should.have.status(200);
		res.body.should.not.have.keys(...excludedKeys);
		res.body.should.have.any.keys("@context");
		res.body.should.include({ id: collectionId });
	});

	it("returns children item with id", async function() {
		const res = await request(this.server)
			.get(url(`${basePath}/${collectionParentId}/children`, { access_token }));
		res.should.have.status(200);
		helpers.isPagedResult(res.body);
		res.body.results.filter((collection) => {
			collection.should.not.have.keys(...excludedKeys);
			collection.should.not.include({ id: collectionParentId });
			collection.should.not.include({ id: collectionRootId });
			return collection.id === collectionId;
		}).should.have.lengthOf(1);
		res.body.should.have.any.keys("@context");
	});

	it("returns roots", async function() {
		const res = await request(this.server)
			.get(url(`${basePath}/roots`, { pageSize: 400, access_token }));
		res.should.have.status(200);
		helpers.isPagedResult(res.body);
		res.body.results.filter((collection) => {
			collection.should.not.have.keys(...excludedKeys);
			collection.should.not.include({ id: collectionParentId });
			collection.should.not.include({ id: collectionId });
			return collection.id === collectionRootId;
		}).should.have.lengthOf(1);
		res.body.should.have.any.keys("@context");
	});
});
