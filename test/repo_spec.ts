import path = require("path");

import Repo = require("../lib/repo");
import utils = require("../lib/utils");

import assert = require("power-assert");

describe("Repo", () => {
	var rootDir = path.resolve(__dirname, "../test-repository");

	describe("#constructor", ()=> {
		it("can parse http style url", ()=> {
			var repo = Repo.createRepo(rootDir, {
				url: "https://github.com/vvakame/dotfiles.git"
			});

			assert(repo.urlInfo);
			assert(!repo.sshInfo);
		});

		it("can parse ssh style url", ()=> {
			var repo = Repo.createRepo(rootDir, {
				url: "git@github.com:vvakame/fs-git.git"
			});

			assert(repo.sshInfo);
			assert(!repo.urlInfo);
		});
	});

	describe("#_resolveTargetDir", ()=> {
		it("can solve targetDir (exclude home dir) by http url", ()=> {
			var repo = Repo.createRepo("/tmp/foobar", {
				url: "https://github.com/vvakame/dotfiles.git"
			});

			assert(repo.targetDir === "/tmp/foobar/git/github.com/vvakame/dotfiles");
		});

		it("can solve targetDir (include home dir) by http url", ()=> {
			var repo = Repo.createRepo("~/foobar", {
				url: "https://github.com/vvakame/dotfiles.git"
			});

			assert(repo.targetDir === utils.homeDir() + "/foobar/git/github.com/vvakame/dotfiles");
		});

		it("can solve targetDir (exclude home dir) by ssh url", ()=> {
			var repo = Repo.createRepo("/tmp/foobar", {
				url: "git@github.com:vvakame/fs-git.git"
			});

			assert(repo.targetDir === "/tmp/foobar/git/github.com/vvakame/fs-git");
		});

		it("can solve targetDir (include home dir) by ssh url", ()=> {
			var repo = Repo.createRepo("~/foobar", {
				url: "git@github.com:vvakame/fs-git.git"
			});

			assert(repo.targetDir === utils.homeDir() + "/foobar/git/github.com/vvakame/fs-git");
		});
	});

	describe("#fetchIfNotInitialized", ()=> {
		it("succeed if this.targetDir is specified", ()=> {
			var repo = Repo.createRepo(rootDir, {
				url: "git@github.com:vvakame/fs-git.git"
			});

			return repo.fetchIfNotInitialized();
		});

		it("failed if this.targetDir is not specified", ()=> {
			var repo = Repo.createRepo(rootDir, {
				url: "git@github.com:vvakame/fs-git.git"
			});

			repo.targetDir = null;
			return repo.fetchIfNotInitialized()
				.then(()=> {
					throw new Error();
				}, ()=> {
					false;
				});
		});
	});

	describe("#fetchAll", ()=> {
		it("can fetch from remote repo", ()=> {
			var repo = Repo
				.createRepo(rootDir, {
					url: "git@github.com:vvakame/fs-git.git"
				});

			assert(!repo.alreadyTryFetchAll);
			return repo.fetchAll()
				.then(repo => {
					assert(repo.alreadyTryFetchAll === true);
					assert(repo.networkConnectivity === true);
					assert(repo.fetchError == null);
				});
		});

		it("can'n fetch from invalid remote repo", ()=> {
			var repo = Repo.createRepo(rootDir, {
				url: "git@github.com:vvakame/notExistsForever.git"
			});

			assert(!repo.alreadyTryFetchAll);
			return repo.fetchAll()
				.then(repo => {
					assert(repo.alreadyTryFetchAll === true);
					assert(repo.networkConnectivity === true);
					assert(repo.fetchError != null);
				});
		});

		it("can'n fetch from unresolved host", ()=> {
			var repo = Repo.createRepo(rootDir, {
				url: "git@not-exists.vvakame.net:hostNotExistsForever.git"
			});

			assert(!repo.alreadyTryFetchAll);
			return repo
				.fetchAll()
				.then<Repo>(()=> {
				throw new Error();
				/* tslint:disable:no-unreachable */
				return repo;
				/* tslint:enable:no-unreachable */
			}, (msg:string) => {
				assert(msg === "no network connectivity");
				return repo;
			})
				.then(repo => {
					assert(repo.alreadyTryFetchAll === true);
					assert(repo.networkConnectivity === false);
				});
		});
	});

	describe("#_buildCommand", ()=> {
		it("can construct command. it include --git-dir option", ()=> {
			var repo = Repo.createRepo(rootDir, {
				url: "git@github.com:vvakame/fs-git.git"
			});

			var command = repo._buildCommand("log");
			assert(command === "git --git-dir=" + rootDir + "/git/github.com/vvakame/fs-git log");
		});
	});

	describe("#open", ()=> {
		it("can open fs-git", ()=> {
			var repo = Repo.createRepo(rootDir, {
				url: "git@github.com:vvakame/fs-git.git"
			});

			return repo.open("master").then(fs=> {
				return fs.exists("README.md");
			});
		});
	});
})
;
