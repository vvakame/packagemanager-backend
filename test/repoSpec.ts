"use strict";

import * as path from "path";

import Repo from "../lib/repo";
import * as utils from "../lib/utils";

import * as assert from "power-assert";

describe("Repo", () => {
	let rootDir = path.resolve(__dirname, "../test-repository");

	describe("#constructor", ()=> {
		it("can parse http style url", ()=> {
			let repo = Repo.createRepo(rootDir, {
				url: "https://github.com/vvakame/dotfiles.git"
			});

			assert(repo.urlInfo);
			assert(!repo.sshInfo);
		});

		it("can parse ssh style url", ()=> {
			let repo = Repo.createRepo(rootDir, {
				url: "git@github.com:vvakame/fs-git.git"
			});

			assert(repo.sshInfo);
			assert(!repo.urlInfo);
		});
	});

	describe("#_resolveTargetDir", ()=> {
		it("can solve targetDir (exclude home dir) by http url", ()=> {
			let repo = Repo.createRepo("/tmp/foobar", {
				url: "https://github.com/vvakame/dotfiles.git"
			});

			if (process.platform === 'win32') {
				assert(repo.targetDir === "C:\\tmp\\foobar\\git\\github.com\\vvakame\\dotfiles");
			} else {
				assert(repo.targetDir === "/tmp/foobar/git/github.com/vvakame/dotfiles");
			}
		});

		it("can solve targetDir (include home dir) by http url", ()=> {
			let repo = Repo.createRepo("~/foobar", {
				url: "https://github.com/vvakame/dotfiles.git"
			});

			if (process.platform === 'win32') {
				assert(repo.targetDir === path.resolve(utils.homeDir(), "foobar/git/github.com/vvakame/dotfiles"));
			} else {
				assert(repo.targetDir === utils.homeDir() + "/foobar/git/github.com/vvakame/dotfiles");
			}
		});

		it("can solve targetDir (exclude home dir) by ssh url", ()=> {
			let repo = Repo.createRepo("/tmp/foobar", {
				url: "git@github.com:vvakame/fs-git.git"
			});

			if (process.platform === 'win32') {
				assert(repo.targetDir === "C:\\tmp\\foobar\\git\\github.com\\vvakame\\fs-git");
			} else {
				assert(repo.targetDir === "/tmp/foobar/git/github.com/vvakame/fs-git");
			}
		});

		it("can solve targetDir (include home dir) by ssh url", ()=> {
			let repo = Repo.createRepo("~/foobar", {
				url: "git@github.com:vvakame/fs-git.git"
			});

			if (process.platform === 'win32') {
				assert(repo.targetDir === path.resolve(utils.homeDir(), "foobar/git/github.com/vvakame/fs-git"));
			} else {
				assert(repo.targetDir === path.resolve(utils.homeDir(), "foobar/git/github.com/vvakame/fs-git"));
			}
		});
	});

	describe("#fetchIfNotInitialized", ()=> {
		it("succeed if this.targetDir is specified", ()=> {
			let repo = Repo.createRepo(rootDir, {
				url: "https://github.com/vvakame/fs-git.git"
			});

			return repo.fetchIfNotInitialized();
		});

		it("failed if this.targetDir is not specified", ()=> {
			let repo = Repo.createRepo(rootDir, {
				url: "https://github.com/vvakame/fs-git.git"
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
			let repo = Repo
				.createRepo(rootDir, {
					url: "https://github.com/vvakame/fs-git.git"
				});

			assert(!repo.alreadyTryFetchAll);
			return repo.fetchAll()
				.then(repo => {
					assert(repo.alreadyTryFetchAll === true);
					assert(repo.networkConnectivity === true);
					assert(repo.fetchError == null);
				});
		});

		it("can't fetch from invalid remote repo", ()=> {
			let repo = Repo.createRepo(rootDir, {
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
			let repo = Repo.createRepo(rootDir, {
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
			let repo = Repo.createRepo(rootDir, {
				url: "https://github.com/vvakame/fs-git.git"
			});

			let command = repo._buildCommand("log");
			assert(command === "git --git-dir=" + path.resolve(rootDir, "git/github.com/vvakame/fs-git") + " log");
		});
	});

	describe("#open", ()=> {
		it("can open fs-git", ()=> {
			let repo = Repo.createRepo(rootDir, {
				url: "https://github.com/vvakame/fs-git.git"
			});

			return repo.open("master").then(fs=> {
				return fs.exists("README.md");
			});
		});
	});
})
;
