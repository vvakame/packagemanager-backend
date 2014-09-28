import Repo = require("../lib/repo");
import PackageManagerBackend = require("../lib/package_manager_backend");

import path = require("path");

import assert = require("power-assert");

describe("Repo", () => {
    var rootDir = path.resolve(__dirname, "../test-repository");

    describe("#constructor", ()=> {
        it("can parse http style url", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir});
            var repo = new Repo(pmb, "https://github.com/vvakame/dotfiles.git");

            assert(repo.urlInfo);
            assert(!repo.sshInfo);
        });

        it("can parse ssh style url", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir});
            var repo = new Repo(pmb, "git@github.com:vvakame/fs-git.git");

            assert(repo.sshInfo);
            assert(!repo.urlInfo);
        });
    });

    describe("#checkUrlInfo", ()=> {
        it("can detect git format", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir});
            var repo = new Repo(pmb, "https://github.com/vvakame/fs-git.git");
            return repo.checkUrlInfo().then(type => {
                assert(type === Repo.Type.Git);
            });
        });

        it("can detect zip format", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir});
            var repo = new Repo(pmb, "https://github.com/vvakame/fs-git/archive/0.1.0.zip");
            return repo.checkUrlInfo().then(type => {
                assert(type === Repo.Type.Zip);
            });
        });

        it("can detect gzip format", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir});
            var repo = new Repo(pmb, "https://github.com/vvakame/fs-git/archive/0.1.0.tar.gz");
            return repo.checkUrlInfo().then(type => {
                assert(type === Repo.Type.GZip);
            });
        });
    });

    describe("#resolveTargetDir", ()=> {
        it("can solve targetDir (exclude home dir) by http url", ()=> {
            var pmb = new PackageManagerBackend({rootDir: "/tmp/foobar"});
            var repo = new Repo(pmb, "https://github.com/vvakame/dotfiles.git");

            repo.getHomeDir = () => "/Users/foobar";
            repo.resolveTargetDir();

            assert(repo.targetDir === "/tmp/foobar/github.com/vvakame/dotfiles.git");
        });

        it("can solve targetDir (include home dir) by http url", ()=> {
            var pmb = new PackageManagerBackend({rootDir: "~/foobar"});
            var repo = new Repo(pmb, "https://github.com/vvakame/dotfiles.git");

            repo.getHomeDir = () => "/Users/fizzbuzz";
            repo.resolveTargetDir();

            assert(repo.targetDir === "/Users/fizzbuzz/foobar/github.com/vvakame/dotfiles.git");
        });

        it("can solve targetDir (exclude home dir) by ssh url", ()=> {
            var pmb = new PackageManagerBackend({rootDir: "/tmp/foobar"});
            var repo = new Repo(pmb, "git@github.com:vvakame/fs-git.git");

            repo.getHomeDir = () => "/Users/foobar";
            repo.resolveTargetDir();

            assert(repo.targetDir === "/tmp/foobar/github.com/vvakame/fs-git.git");
        });

        it("can solve targetDir (include home dir) by ssh url", ()=> {
            var pmb = new PackageManagerBackend({rootDir: "~/foobar"});
            var repo = new Repo(pmb, "git@github.com:vvakame/fs-git.git");

            repo.getHomeDir = () => "/Users/fizzbuzz";
            repo.resolveTargetDir();

            assert(repo.targetDir === "/Users/fizzbuzz/foobar/github.com/vvakame/fs-git.git");
        });
    });

    describe("#resolve", ()=> {
        it("succeed if this.targetDir is specified", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir});
            var repo = new Repo(pmb, "git@github.com:vvakame/fs-git.git");

            repo.gitFetchAll = () => Promise.resolve(<any>null);
            return repo.resolve();
        });

        it("failed if this.targetDir is not specified", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir});
            var repo = new Repo(pmb, "git@github.com:vvakame/fs-git.git");
            repo.targetDir = null;

            return repo.resolve().then(()=> {
                throw new Error();
            }, ()=> {
                false;
            });
        });
    });

    describe("#gitFetchAll", ()=> {
        it("can fetch from remote repo", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir});
            var repo = new Repo(pmb, "git@github.com:vvakame/fs-git.git");

            assert(!repo.alreadyTryFetchAll);

            return repo.gitFetchAll().then(()=> {
                assert(repo.alreadyTryFetchAll === true);
                assert(repo.networkConnectivity === true);
                assert(repo.fetchError == null);
            });
        });

        it("can'n fetch from invalid remote repo", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir});
            var repo = new Repo(pmb, "git@github.com:vvakame/notExistsForever.git");

            assert(!repo.alreadyTryFetchAll);

            return repo.gitFetchAll().then(()=> {
                assert(repo.alreadyTryFetchAll === true);
                assert(repo.networkConnectivity === true);
                assert(repo.fetchError != null);
            });
        });

        it("can'n fetch from unresolved host", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir});
            var repo = new Repo(pmb, "git@not-exists.vvakame.net:hostNotExistsForever.git");

            assert(!repo.alreadyTryFetchAll);

            return repo.gitFetchAll().then(()=> {
                throw new Error();
            }, ()=> {
                assert(repo.alreadyTryFetchAll === true);
                assert(repo.networkConnectivity === false);
            });
        });
    });

    describe("#buildCommand", ()=> {
        it("can construct command. it include --git-dir option", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir});
            var repo = new Repo(pmb, "git@github.com:vvakame/fs-git.git");

            var command = repo.buildCommand("log");
            assert(command === "git --git-dir=" + rootDir + "/github.com/vvakame/fs-git.git log");
        });
    });

    describe("#open", ()=> {
        it("can open fs-git", ()=> {
            var pmb = new PackageManagerBackend({rootDir: rootDir});
            var repo = new Repo(pmb, "git@github.com:vvakame/fs-git.git");

            return repo.open("master").then(fs=> {
                return fs.exists("README.md");
            });
        });
    });
});
