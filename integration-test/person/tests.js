var config = require("../config.json"); var helpers = require("../helpers");
const { request } = require("chai");

describe("/person", function() {
	var basePath = config["urls"]["person"];
	var profileKey;

	it("returns 401 when fetching with id and no access token specified", function(done) {
		var query = basePath + "/by-id/" + config["user"]["model"]["id"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns 401 when fetching with token and no access token specified", function(done) {
		var query = basePath + "/by-id/" + config["user"]["model"]["id"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns user object without sensitive data when accessing with id", function(done) {
		var query = basePath + "/by-id/" + config["user"]["model"]["id"] + "?access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.not.have.property("emailAddress");
				res.body.should.not.have.property("lintuvaaraLoginName");
				res.body.should.not.have.property("address");
				res.body.should.have.property("id");
				done();
			});
	});

	it("returns full user object when accessing with token", function(done) {
		var query = basePath + "/" + config["user"]["token"] + "?access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.eql(config.user.model);
				done();
			});
	});

	it("returns fullname for user that only has inherited and preferred names", function(done) {
		var query = basePath + "/by-id/" + config.user.missing_fullname + "?access_token=" + config.access_token;
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.be.a("object");
				res.body.should.have.property("fullName");
				res.body.fullName.should.not.be.empty;
				done();
			});
	});

	it("returns 404 when asking with non existing id", function(done) {
		var query = basePath + "/by-id/MA.FOOBAR?access_token=" + config.access_token;
		request(this.server)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(404);
				done();
			});
	});

	describe("/friends delete", function() {
		it("removes friends from both users", function(done) {
			if (!config.user.friend_token) {
				this.skip();
			}
			var query = basePath + "/" + config.user.token + "/friends/" + config.user.friend_id
				+ "?access_token=" + config.access_token;
			request(this.server)
				.delete(query)
				.end((err, res) => {
					res.should.have.status(200);
					var query = basePath + "/" + config.user.friend_token + "/friends/" + config.user.model.id
						+ "?access_token=" + config.access_token;
					request(this.server)
						.delete(query)
						.end(function(err, res) {
							res.should.have.status(200);
							done();
						});
				});
		});
	});

	describe("/profile PUT", function() {

		it("cannot update userID", function(done) {
			var query = basePath + "/" + config.user.token + "/profile"
				+ "?access_token=" + config.access_token;
			var profile = {
				userID: "MA.9009"
			};
			request(this.server)
				.put(query)
				.send(profile)
				.end(function(err, res) {
					res.should.have.status(422);
					res.body.should.have.property("message").eql("userID cannot be updated by this method");
					done();
				});
		});

		it("updates profile when asked to", function(done) {
			var query = basePath + "/" + config.user.token + "/profile"
				+ "?access_token=" + config.access_token;
			var profile = {
				settings: {
					search: "none"
				}
			};
			request(this.server)
				.put(query)
				.send(profile)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					res.body.should.have.property("id");
					res.body.should.have.property("userID").eql(config.user.model.id);
					res.body.should.have.property("profileKey");
					res.body.should.have.property("friends").eql([]);
					res.body.should.have.property("blocked");
					res.body.should.have.property("friendRequests");
					res.body.should.have.property("settings").eql(profile.settings);
					done();
				});
		});

		it("will not update profile id", function(done) {
			var query = basePath + "/" + config.user.token + "/profile"
				+ "?access_token=" + config.access_token;
			var profile = {
				id: "JX.0"
			};
			request(this.server)
				.put(query)
				.send(profile)
				.end(function(err, res) {
					res.should.have.status(422);
					res.body.should.have.property("message").eql("id cannot be updated by this method");
					done();
				});
		});

		it("will not allow updating friends", function(done) {
			var query = basePath + "/" + config.user.token + "/profile"
				+ "?access_token=" + config.access_token;
			var profile = {
				friends: ["MA.97"]
			};
			request(this.server)
				.put(query)
				.send(profile)
				.end(function(err, res) {
					res.should.have.status(422);
					res.body.should.have.property("message").eql("friends cannot be updated by this method");
					done();
				});
		});

		it("will not allow updating friends requests", function(done) {
			var query = basePath + "/" + config.user.token + "/profile"
				+ "?access_token=" + config.access_token;
			var profile = {
				friendRequests: ["MA.007"]
			};
			request(this.server)
				.put(query)
				.send(profile)
				.end(function(err, res) {
					res.should.have.status(422);
					res.body.should.have.property("message").eql("friendRequests cannot be updated by this method");
					done();
				});
		});
	});

	describe("/profile other", function() {

		it("deletes friend",function(done) {
			if (!config.user.friend_token) {
				this.skip();
			}
			var query = basePath + "/" + config.user.token + "/friends/" + config.user.friend_id
				+ "?access_token=" + config.access_token;
			request(this.server)
				.delete(query)
				.end(function(err, res) {
					done();
				});
		});

		it("returns 404 when no correct user token given", function(done) {
			var query = basePath + "/foobar/profile"
				+ "?access_token=" + config.access_token;
			request(this.server)
				.get(query)
				.end(function(err, res) {
					res.should.have.status(400);
					done();
				});
		});

		it("returns users public profile", function(done) {
			var query = basePath + "/by-id/" + config.user.model.id + "/profile"
				+ "?access_token=" + config.access_token;
			request(this.server)
				.get(query)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					res.body.should.have.property("userID");
					res.body.should.have.property("profileKey");
					res.body.should.not.have.property("id");
					res.body.should.not.have.property("friends");
					res.body.should.not.have.property("blocked");
					res.body.should.not.have.property("friendRequests");
					res.body.should.not.have.property("settings");
					done();
				});
		});

		it("returns users full profile", function(done) {
			var query = basePath + "/" + config.user.token + "/profile"
				+ "?access_token=" + config.access_token;
			request(this.server)
				.get(query)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					res.body.should.have.property("id");
					res.body.should.have.property("userID");
					res.body.should.have.property("profileKey");
					res.body.should.have.property("friends").eql([]);
					res.body.should.have.property("blocked");
					res.body.should.have.property("friendRequests");
					res.body.should.have.property("settings");
					profileKey = res.body.profileKey;
					done();
				});
		});
	});

	describe("friend tests", function() {

		it("It can make a friend request", function(done) {
			if (!config.user.friend_token) {
				this.skip();
			}
			var query = basePath + "/" + config.user.friend_token + "/friends/" + profileKey
				+ "?access_token=" + config.access_token;
			request(this.server)
				.post(query)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(201);
					res.body.should.have.property("id");
					res.body.should.have.property("userID");
					res.body.should.have.property("profileKey");
					res.body.should.have.property("friends");
					res.body.should.have.property("blocked");
					res.body.should.have.property("friendRequests");
					res.body.should.have.property("settings");
					done();
				});

		});

		it("returns 422 when asking as a friend again", function(done) {
			if (!config.user.friend_token) {
				this.skip();
			}
			var query = basePath + "/" + config.user.friend_token + "/friends/" + profileKey
				+ "?access_token=" + config.access_token;
			request(this.server)
				.post(query)
				.end(function(err, res) {
					res.should.have.status(422);
					done();
				});
		});

		it("can block friend request", function(done) {
			if (!config.user.friend_token) {
				this.skip();
			}
			var query = basePath + "/" + config.user.token + "/friends/" + config.user.friend_id
				+ "?access_token=" + config.access_token + "&block=true";
			request(this.server)
				.delete(query)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					res.body.should.have.property("friends");
					res.body.friends.should.not.contain(config.user.friend_id);
					done();
				});
		});

		it("does not allow blocked user to make a friend request", function(done) {
			if (!config.user.friend_token) {
				this.skip();
			}
			var query = basePath + "/" + config.user.friend_token + "/friends/" + profileKey
				+ "?access_token=" + config.access_token;
			request(this.server)
				.post(query)
				.end((err, res) => {
					res.should.have.status(422);
					query = basePath + "/" + config.user.token + "/profile"
						+ "?access_token=" + config.access_token;
					request(this.server)
						.get(query)
						.end(function (err, res) {
							if (err) return done(err);
							res.should.have.status(200);
							res.body.should.have.property("friends");
							res.body.should.have.property("friendRequests");
							res.body.should.have.property("blocked");
							res.body.blocked.should.contain(config.user.friend_id);
							res.body.friends.should.not.contain(config.user.friend_id);
							res.body.friendRequests.should.not.contain(config.user.friend_id);
							done();
						});
				});
		});

		it("allows to remove block from a friends", function(done) {
			if (!config.user.friend_token) {
				this.skip();
			}
			var query = basePath + "/" + config.user.token + "/profile"
				+ "?access_token=" + config.access_token;
			var profile = {
				blocked: []
			};
			request(this.server)
				.put(query)
				.send(profile)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					res.body.should.have.property("blocked");
					res.body.blocked.should.not.contain(config.user.friend_id);
					done();
				});
		});

		it("allows unblocked person to make friend request", function(done) {
			if (!config.user.friend_token) {
				this.skip();
			}
			var query = basePath + "/" + config.user.friend_token + "/friends/" + profileKey
				+ "?access_token=" + config.access_token;
			request(this.server)
				.post(query)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(201);
					done();
				});
		});

		it("allows to accept friend request", function(done) {
			if (!config.user.friend_token) {
				this.skip();
			}
			var query = basePath + "/" + config.user.token + "/friends/" + config.user.friend_id
				+ "?access_token=" + config.access_token;
			request(this.server)
				.put(query)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					done();
				});
		});

		it("shows accepted friends on are accepted on both user", function(done) {
			if (!config.user.friend_token) {
				this.skip();
			}
			var query = basePath + "/" + config.user.token + "/profile/"
				+ "?access_token=" + config.access_token;
			request(this.server)
				.get(query)
				.end((err, res) => {
					if (err) return done(err);
					res.should.have.status(200);
					res.body.should.have.property("friends");
					res.body.friends.should.contain(config.user.friend_id);
					var query = basePath + "/" + config.user.friend_token + "/profile/"
						+ "?access_token=" + config.access_token;
					request(this.server)
						.get(query)
						.end(function(err, res) {
							if (err) return done(err);
							res.should.have.status(200);
							res.body.should.have.property("friends");
							res.body.friends.should.contain(config.user.model.id);
							done();
						});
				});
		});

	});
});
