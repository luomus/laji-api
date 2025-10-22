var fs = require("fs");
var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");
const { url } = helpers;
const { access_token } = config;

const errorOnlyOwn = "Can only update media uploaded by the user";
const errorOnlyOwnDelete = "Can only delete media uploaded by the user";

const itemProperties = [
	"@context",
	"id",
	"intellectualRights",
	"intellectualOwner",
	"uploadedBy",
	"thumbnailURL",
	"taxonVerbatim",
	"squareThumbnailURL",
	"LuomusIntellectualRights",
	"captureDateTime",
	"capturerVerbatim",
	"fullURL",
	"keyword",
	"largeURL",
	"originalURL"
];

describe("/image", function() {
	var basePath =  "/images";
	var imageTmpId;
	var imageId;
	const imageOthers = "MM.55530";

	it("returns 401 when no access token specified", async function() {
		const res = await request(this.server)
			.get(`${basePath}/${imageOthers}`);
		res.should.have.status(401);
	});

	it("returns 401 when no access token specified for id", async function() {
		const res = await request(this.server)
			.get(`${basePath}/${imageOthers}`);
		res.should.have.status(401);
	});

	it("returns 400 when no person token specified for post request", async function() {
		const res = await request(this.server)
			.post(url(`${basePath}/${imageOthers}`, { access_token }))
			.send({ intellectualRights: "MZ.intellectualRightsCC-BY-SA-4.0" });
		res.should.have.status(400);
	});

	it("returns 400 when no person token specified for put request", async function() {
		const res = await request(this.server)
			.put(url(`${basePath}/${imageOthers}`, { access_token }))
			.send({});
		res.should.have.status(400);
	});

	it("returns 400 when no person token specified for delete request", async function() {
		const res = await request(this.server)
			.delete(url(`${basePath}/${imageOthers}`, { access_token }));
		res.should.have.status(400);
	});

	it("returns 400 when trying to update others image", async function() {
		const res = await request(this.server)
			.put(url(`${basePath}/${imageOthers}`, { access_token, personToken }))
			.send({});
		res.should.have.status(400);
		res.body.should.include({ message: errorOnlyOwn });
	});

	it("returns 400 when trying to delete others image", async function() {
		const res = await request(this.server)
			.delete(url(`${basePath}/${imageOthers}`, { access_token, personToken }))
		res.should.have.status(400);
		res.body.should.include({ message: errorOnlyOwnDelete });
	});

	it("returns a temp id when adding image", async function() {
		const res = await request(this.server)
			.post(url(basePath, { access_token, personToken }))
			.attach("image", fs.readFileSync(__dirname + "/bird.jpg"), "bird.jpg")
		res.should.have.status(200);
		res.body.should.be.a("array");
		res.body.should.have.lengthOf(1);
		res.body[0].should.have.keys("name", "filename", "id", "expires");
		imageTmpId = res.body[0].id;
	});

	describe("after receiving temporal id", function() {

		it("Cannot update meta object with empty object", async function() {
			if (!imageTmpId) {
				this.skip();
			}
			this.timeout(10000);
			const res = await request(this.server)
				.post(url(`${basePath}/${imageTmpId}`, { access_token, personToken }))
				.send({});
			res.should.have.status(422);
		});


		it("returns a meta object", async function() {
			if (!imageTmpId) {
				this.skip();
			}
			this.timeout(5000);
			const rights = "MZ.intellectualRightsCC-BY-SA-4.0";
			const owner = "Viltsu testaaja";
			const res = await request(this.server)
				.post(url(`${basePath}/${imageTmpId}`, { access_token, personToken }))
				.send({ intellectualRights: rights, intellectualOwner: owner });
			res.should.have.status(201);
			res.body.should.be.a("object");
			helpers.toHaveOnlyKeys(res.body, itemProperties);
			res.body.should.include({
				intellectualRights: rights,
				intellectualOwner: owner,
				uploadedBy: config.person.id
			});
			imageId = res.body.id;
		});
	});

	describe("after receiving id", function() {
		it("updates image meta data", async function() {
			if (!imageId) {
				this.skip();
			}
			this.timeout(5000);
			var meta = {
				intellectualRights: "MZ.intellectualRightsCC-BY-4.0",
				intellectualOwner: "Viltsu",
				uploadedBy: "MA.97"
			};
			const res = await request(this.server)
				.put(url(`${basePath}/${imageId}`, { access_token, personToken }))
				.send(meta);
			res.should.have.status(200);
			res.body.should.be.a("object");
			helpers.toHaveOnlyKeys(res.body, itemProperties);
			res.body.should.have.property("intellectualRights").eql(meta.intellectualRights);
			res.body.should.have.property("intellectualOwner").eql(meta.intellectualOwner);
			res.body.should.have.property("uploadedBy").eql(config.person.id);
		});

		it("doesn't accept garbage", async function() {
			if (!imageId) {
				this.skip();
			}
			this.timeout(5000);
			var meta = {
				intellectualRights: "FooBar"
			};
			const res = await request(this.server)
				.put(url(`${basePath}/${imageId}`, { access_token, personToken }))
				.send(meta);
			res.should.have.status(400);
		});

		it("returns large jpg", async function() {
			if (!imageId) {
				this.skip();
			}
			const res = await request(this.server)
				.get(url(`${basePath}/${imageId}/large.jpg`, { access_token }))
			res.should.have.status(200);
			res.should.have.header("content-type", "image/jpeg");
		});


		it("returns square jpg", async function() {
			if (!imageId) {
				this.skip();
			}
			const res = await request(this.server)
				.get(url(`${basePath}/${imageId}/square.jpg`, { access_token }));
			res.should.have.status(200);
			res.should.have.header("content-type", "image/jpeg");
		});

		it("returns thumbnail jpg", async function() {
			if (!imageId) {
				this.skip();
			}
			const res = await request(this.server)
				.get(url(`${basePath}/${imageId}/thumbnail.jpg`, { access_token }));
			res.should.have.status(200);
			res.should.have.header("content-type", "image/jpeg");
		});

		it("deletes image", async function() {
			if (!imageId) {
				this.skip();
			}
			this.timeout(5000);
			const res = await request(this.server)
				.delete(url(`${basePath}/${imageId}`, { access_token, personToken }));
			res.should.have.status(204);
		});
	});
});
