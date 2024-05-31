var config = require("../config.json"); var helpers = require("../helpers");
const { request } = require("chai");

describe("/notifications", function() {
	var basePath = config["urls"]["notifications"];
	const personBasePath = config["urls"]["person"];
	const token = config["user"]["token"];
	const accessToken = config["access_token"];

	it("returns 401 when fetching with person token and no access token specified", async function() {
		var query = basePath + "/" + token;
		const res = await request(this.server).get(query);
		res.should.have.status(401);
	});
	it("returns 401 when fetching with token and no access token specified", async function() {
		var query = basePath + "/" + token;
		const res = await request(this.server).get(query);
		res.should.have.status(401);
	});

	var lengthBeforeNew;

	it("returns notifications", async function() {
		var query = basePath + "/" + token + "?access_token=" + accessToken;
		const res = await request(this.server).get(query);
		res.should.have.status(200);
		res.body.results.length.should.be.above(1);
		res.body.results.every(item => {
			item.should.have.property("id");
			item.should.have.property("created");
		});
		lengthBeforeNew = res.body.total;
	});

	var addedNotification;

	it("updating notification doesn't allow other than seen property", async function() {

		// Create a notification first by adding friend request. This would be nice to do in after/before, but mocha/chai
		// doesn't keep the order of test execution correct then. The last test removes the friend request, so the
		// original state of the friends is restored.
		var query = personBasePath + "/" + token + "/friends/" + config.user.profileKey
			+ "?access_token=" + accessToken;
		await request(this.server).post(query);

		// Notification is created in background when friend request is made, so we wait for that.
		await new Promise(resolve => setTimeout(resolve, 500));
		while (!addedNotification) {
			var query = basePath + "/" + token + "?access_token=" + accessToken + "&page=" + (lengthBeforeNew + 1) + "&pageSize=1";
			const notificationsRes = await request(this.server).get(query);
			addedNotification = notificationsRes.body.results && notificationsRes.body.results[0];
			await new Promise(resolve => setTimeout(resolve, 500));
		}

		var query = basePath + "/" + addedNotification.id + "?access_token=" + accessToken + "&personToken=" + token;
		const updateRes = await request(this.server)
			.put(query)
			.send({ ...addedNotification, friendRequest: ["foo"] })
		updateRes.should.have.status(422);
	});

	it("updating notification allows updating seen property", async function() {
		if (!addedNotification) {
			throw new Error("added notification not found");
		}
		var query = basePath + "/" + addedNotification.id + "?access_token=" + accessToken + "&personToken=" + token;
		const res = await request(this.server)
			.put(query)
			.send({ ...addedNotification, seen: true })
		res.body.seen.should.be.equal(true);
	});

	it("allows deleting", async function() {
		if (!addedNotification) {
			throw new Error("added notification not found");
		}
		var query = basePath + "/" + addedNotification.id + "?access_token=" + accessToken + "&personToken=" + token;
		const res = await request(this.server)
			.delete(query);
		res.should.have.status(200);
	});

	it("doesn't allow updating other's notification", async function() {
		if (!addedNotification) {
			throw new Error("added notification not found");
		}
		var query = basePath + "/" + config["objects"]["friend_notification"]["id"] + "?access_token=" + accessToken + "&personToken=" + token;
		const res = await request(this.server)
			.put(query)
			.send(config["objects"]["friend_notification"]);
		res.should.have.status(403);
	});

	it("doesn't allow deleting other's notification", async function() {
		if (!addedNotification) {
			throw new Error("added notification not found");
		}
		var query = basePath + "/" + config["objects"]["friend_notification"]["id"] + "?access_token=" + accessToken + "&personToken=" + token;
		const res = await request(this.server).delete(query);
		res.should.have.status(403);
	});

	it("clear friends after", async function() {
		var query = personBasePath + "/" + token + "/friends/" + config["user"]["model"]["id"] + "?access_token=" + accessToken + "&personToken=" + token;
		await request(this.server).delete(query);
	});
});
