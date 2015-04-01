<a name"0.6.5"></a>
### 0.6.5 (2015-04-02)


#### Bug Fixes

* **packagemanager-backend:** fix for node v0.10 ([d09cb84f](https://github.com/vvakame/packagemanager-backend/commit/d09cb84f))


<a name"0.6.4"></a>
### 0.6.4 (2015-04-02)


#### Features

* **ci:** add appveyor.yml ([5236ee07](https://github.com/vvakame/packagemanager-backend/commit/5236ee07))
* **packagemanager-backend:** fix for windows git client ([2d4a8ddc](https://github.com/vvakame/packagemanager-backend/commit/2d4a8ddc))


<a name="0.6.3"></a>
### 0.6.3 (2015-03-23)


#### Bug Fixes

* **packagemanager-backend:** add care of null value from resolveMissingDependency refs #1 ([b6ddbbfd](https://github.com/vvakame/packagemanager-backend/commit/b6ddbbfde0ea8377efe82d28fae0e81ebf63ee50))


<a name="0.6.2"></a>
### 0.6.2 (2015-03-13)


#### Bug Fixes

* **deps:** add test-repository to .npmignore ([b63d1dc2](https://github.com/vvakame/packagemanager-backend/commit/b63d1dc21cd20fe8eb80ea4d75d236fba9ee7617))


<a name="0.6.1"></a>
### 0.6.1 (2015-02-25)


#### Bug Fixes

* **packagemanager-backend:** detect and stop infinite loop in resolveMissingDependency ([d3840dba](https://github.com/vvakame/packagemanager-backend/commit/d3840dba428120c902ac0ae8f7295846212e1bd0))


<a name="0.6.0"></a>
## 0.6.0 (2015-02-25)


#### Features

* **packagemanager-backend:** add resolveMissingDependency method to Recipe interface and implement handling it ([2072375a](https://github.com/vvakame/packagemanager-backend/commit/2072375ac8815a7fc0620296b897aafb2441cd87))


<a name="0.5.1"></a>
### 0.5.1 (2015-02-20)


#### Bug Fixes

* **packagemanager-backend:** fix construct unresolvedDependencies logic ([6781978d](https://github.com/vvakame/packagemanager-backend/commit/6781978d7abfaf9124790397e16c3a77ff7e7205))


<a name="0.5.0"></a>
## 0.5.0 (2015-02-19)


#### Features

* **packagemanager-backend:**
  * detect and stop running about cyclic dependencies ([c93e4e66](https://github.com/vvakame/packagemanager-backend/commit/c93e4e66929a08ee2110ded9977d3de26e06e2a3))
  * improve toJSON styling ([cdc16a8e](https://github.com/vvakame/packagemanager-backend/commit/cdc16a8e6caf62ba5213e82146860de42db1a5f4))
  * save dependency tree to Result ([d5e1318d](https://github.com/vvakame/packagemanager-backend/commit/d5e1318d18b2dddac304ec436a402d327a6ac41d))
  * add dependency depth property to Dependency and DepResult ([06f02e75](https://github.com/vvakame/packagemanager-backend/commit/06f02e7558d75d0140d3639a515ce97750882336))


<a name="0.3.3"></a>
### 0.3.3 (2015-02-08)


#### Features

* **fs-git:** move feature of es6 polyfill main code to test code ([de07c839](https://github.com/vvakame/packagemanager-backend/commit/de07c8393d18d313a1df4659984f891408504e5c))


<a name="0.3.0"></a>
## 0.3.0 (2015-02-07)


#### Features

* **deps:** add grunt-conventional-changelog ([0ae9a906](https://github.com/vvakame/packagemanager-backend/commit/0ae9a90631bd67009e04996a754c0cdf084dbdcf))
* **packagemanager-backend:** add fileInfo: fsgit.FileInfo to DepResult ([c9e50458](https://github.com/vvakame/packagemanager-backend/commit/c9e50458d471a87d429a029901ddf0722a507498))

