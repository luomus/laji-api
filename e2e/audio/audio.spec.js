const fs = require("fs");
const config = require("../config.json");
const helpers = require("../helpers");
const { request } = require("chai");
const { url } = helpers;
const { access_token, personToken } = config;

const errorOnlyOwn = "Can only update media uploaded by the user";
const errorOnlyOwnDelete = "Can only delete media uploaded by the user";

const commonProperties = [
	"@context",
	"id",
	"intellectualRights",
	"intellectualOwner",
	"uploadedBy",
	"thumbnailURL",
	"taxonVerbatim",
	"LuomusIntellectualRights",
	"captureDateTime",
	"capturerVerbatim",
	"fullURL",
	"keyword",
	"mp3URL"
];
const wavItemProperties = [
	...commonProperties,
	"wavURL"
];
const flacItemProperties = [
	...commonProperties,
	"flacURL"
];


const audioOthers = "MM.97725";

describe("/audio", function() {
	var basePath =  "/audio";
	var audioTmpId;
	var audioId;
	var flacAudioTmpId;
	var flacAudioId;

	it("returns 401 when no access token specified for id", async function() {
		const res = await request(this.server)
			.get(`${basePath}/${audioOthers}`);
		res.should.have.status(401);
	});

	it("returns 400 when no person token specified for post request", async function() {
		const res = await request(this.server)
			.post(url(`${basePath}/${audioOthers}`, { access_token }))
			.send({ intellectualRights: "MZ.intellectualRightsCC-BY-SA-4.0" });
		res.should.have.status(400);
	});

	it("returns 400 when no person token specified for put request", async function() {
		const res = await request(this.server)
			.put(url(`${basePath}/${audioOthers}`, { access_token }))
			.send({});
		res.should.have.status(400);
	});

	it("returns 400 when no person token specified for delete request", async function() {
		const res = await request(this.server)
			.delete(url(`${basePath}/${audioOthers}`, { access_token }));
		res.should.have.status(400);
	});

	it("returns 400 when trying to update others audio", async function() {
		this.timeout(6000);
		const res = await request(this.server)
			.put(url(`${basePath}/${audioOthers}`, { access_token, personToken }))
			.send({});
		res.should.have.status(400);
		res.body.should.include({ message: errorOnlyOwn });
	});

	it("returns 400 when trying to delete others audio", async function() {
		const res = await request(this.server)
			.delete(url(`${basePath}/${audioOthers}`, { access_token, personToken }));
		res.should.have.status(400);
		res.body.should.include({ message: errorOnlyOwnDelete });
	});

	it("returns a temp id when adding audio", async function() {
		this.timeout(6000);
		const res = await request(this.server)
			.post(url(basePath, { access_token, personToken }))
			.attach("audio", fs.readFileSync(__dirname + "/bird.wav"), "bird.wav");
		res.should.have.status(200);
		res.body.should.be.a("array");
		res.body.should.have.lengthOf(1);
		res.body[0].should.have.keys("name", "filename", "id", "expires");
		audioTmpId = res.body[0].id;
	});

	describe("after receiving temporal id", function() {

		it("Cannot update meta object with empty object", async function() {
			if (!audioTmpId) {
				this.skip();
			}
			this.timeout(10000);
			const res = await request(this.server)
				.post(url(`${basePath}/${audioTmpId}`, { access_token, personToken }))
				.send({});
			res.should.have.status(422);
		});


		it("returns a meta object", async function() {
			if (!audioTmpId) {
				this.skip();
			}
			this.timeout(5000);
			const rights = "MZ.intellectualRightsCC-BY-SA-4.0";
			const owner = "Viltsu testaaja";
			const res = await request(this.server)
				.post(url(`${basePath}/${audioTmpId}`, { access_token, personToken }))
				.send({ intellectualRights: rights, intellectualOwner: owner });
			res.should.have.status(201);
			res.body.should.be.a("object");
			helpers.toHaveOnlyKeys(res.body, wavItemProperties);
			res.body.should.include({
				intellectualRights: rights,
				intellectualOwner: owner,
				uploadedBy: "MA.314"
			});
			audioId = res.body.id;
		});
	});

	describe("after receiving id", function() {
		it("updates audio meta data", async function() {
			if (!audioId) {
				this.skip();
			}
			this.timeout(5000);
			var meta = {
				intellectualRights: "MZ.intellectualRightsCC-BY-4.0",
				intellectualOwner: "Viltsu",
				uploadedBy: "MA.97"
			};
			const res = await request(this.server)
				.put(url(`${basePath}/${audioId}`, { access_token, personToken }))
				.send(meta);
			res.should.have.status(200);
			res.body.should.be.a("object");
			helpers.toHaveOnlyKeys(res.body, wavItemProperties);
			res.body.should.have.property("intellectualRights").eql(meta.intellectualRights);
			res.body.should.have.property("intellectualOwner").eql(meta.intellectualOwner);
			res.body.should.have.property("uploadedBy").eql("MA.314");
		});

		it("doesn't accept garbage", async function() {
			if (!audioId) {
				this.skip();
			}
			this.timeout(5000);
			var meta = {
				intellectualRights: "FooBar"
			};
			const res = await request(this.server)
				.put(url(`${basePath}/${audioId}`, { access_token, personToken }))
				.send(meta);
			res.should.have.status(400);
		});

		it("returns wav", async function() {
			if (!audioId) {
				this.skip();
			}
			this.timeout(6000);
			const res = await request(this.server)
				.get(url(`${basePath}/${audioId}/wav`, { access_token }));
			res.should.have.status(200);
			res.should.have.header("content-type", "audio/x-wav");
		});


		it("returns mp3", async function() {
			if (!audioId) {
				this.skip();
			}
			const res = await request(this.server)
				.get(url(`${basePath}/${audioId}/mp3`, { access_token }));
			res.should.have.status(200);
			res.should.have.header("content-type", "audio/mpeg");
		});

		it("returns thumbnail jpg", async function() {
			if (!audioId) {
				this.skip();
			}
			const res = await request(this.server)
				.get(url(`${basePath}/${audioId}/thumbnail.jpg`, { access_token }));
			res.should.have.status(200);
			res.should.have.header("content-type", "image/jpeg");
		});

		it("deletes audio", async function() {
			if (!audioId) {
				this.skip();
			}
			this.timeout(5000);
			const res = await request(this.server)
				.delete(url(`${basePath}/${audioId}`, { access_token, personToken }));
			res.should.have.status(204);
		});
	});

	describe("flac audio", function() {
		it("returns a temp id when adding flac audio", async function() {
			const res = await request(this.server)
				.post(url(basePath, { access_token, personToken }))
				.attach("audio", fs.readFileSync(__dirname + "/bat.flac"), "bat.flac");
			res.should.have.status(200);
			res.body.should.be.a("array");
			res.body.should.have.lengthOf(1);
			res.body[0].should.have.keys("name", "filename", "id", "expires");
			flacAudioTmpId = res.body[0].id;
		});

		it("returns a meta object for flac audio", async function() {
			if (!flacAudioTmpId) {
				this.skip();
			}
			this.timeout(5000);
			const rights = "MZ.intellectualRightsCC-BY-SA-4.0";
			const owner = "Viltsu testaaja";
			const res = await request(this.server)
				.post(url(`${basePath}/${flacAudioTmpId}`, { access_token, personToken }))
				.send({ intellectualRights: rights, intellectualOwner: owner });
			res.should.have.status(201);
			res.body.should.be.a("object");
			helpers.toHaveOnlyKeys(res.body, flacItemProperties);
			res.body.should.include({
				intellectualRights: rights,
				intellectualOwner: owner,
				uploadedBy: "MA.314"
			});
			flacAudioId = res.body.id;
		});

		it("returns flac", async function() {
			if (!flacAudioId) {
				this.skip();
			}
			const res = await request(this.server)
				.get(url(`${basePath}/${flacAudioId}/flac`, { access_token }));
			res.should.have.status(200);
			res.should.have.header("content-type", "audio/flac");
		});
	});
});
