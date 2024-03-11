# Climate Tokenization Engine

![Minimum Chia Version](https://raw.githubusercontent.com/Chia-Network/core-registry-api/main/minimumChiaVersion.svg)  
![Tested Up to Chia Version](https://raw.githubusercontent.com/Chia-Network/core-registry-api/main/testedChiaVersion.svg)

The Climate Tokenization Engine is open source software that allows carbon registries to be able to tokenize existing carbon credit units onto a public blockchain. 

By using the Climate Tokenization Engine, registries are able to control what gets tokenized, and can easily track on chain activity for any created tokens. This gives the registry ultimate control over the data to ensure the registry is able to maintain data integrity, while engaging with expanded markets that exist on blockchain.

The Climate Tokenization Engine requires a [CADT](https://github.com/Chia-Network/cadt) instance (not running in read-only mode) to connect to.  We recommend running CADT on the same system as the Tokenization Engine for ease of use and enhanced security.

A graphical user interface is available with the [Climate Tokenization Engine User Interface](https://github.com/Chia-Network/Climate-Tokenization-Engine-UI).

*Note that this application was previously known as the Climate Portal.*

## Related Projects

* [Chia Blockchain](https://github.com/Chia-Network/chia-blockchain)
* [Climate Tokenization Engine User Interface](https://github.com/Chia-Network/Climate-Tokenization-Engine-UI)
* [Climate Explorer](https://github.com/Chia-Network/climate-token-driver)
* [Chia Climate Tokenization](https://github.com/Chia-Network/climate-token-driver)
* [Climate Explorer UI](https://github.com/Chia-Network/climate-explorer-ui)
* [Climate Wallet](https://github.com/Chia-Network/Climate-Wallet)
* [Climate Action Data Trust](https://github.com/Chia-Network/cadt)
* [Climate Action Data Trust UI](https://github.com/Chia-Network/cadt-ui)

## Installation

Precompiled packages are available for MacOS, Windows, and Debian-based Linux distros on the [releases](https://github.com/Chia-Network/Climate-Tokenization-Engine/releases) page. 

### Debian-based Linux Distros (Ubuntu, Mint, etc)

The Climate Tokenization Engine can be installed with `apt`.  Both ARM and x86 versions can be installed this way. 

1. Start by updating apt and allowing repository download over HTTPS:

```
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg
```

2.  Add Chia's official GPG Key (if you have installed Chia with `apt`, you'll have this key already and will get a message about overwriting the existing key, which is safe to do):

```
curl -sL https://repo.chia.net/FD39E6D3.pubkey.asc | sudo gpg --dearmor -o /usr/share/keyrings/chia.gpg
```

3. Use the following command to setup the repository.

```
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/chia.gpg] https://repo.chia.net/climate-tokenization/debian/ stable main" | sudo tee /etc/apt/sources.list.d/climate-tokenization.list > /dev/null
```

4.  Install the Climate Tokenization Engine

```
sudo apt-get update
sudo apt-get install climate-tokenization-engine
```

5.  Start the Climate Tokenization Engine with systemd

```
sudo systemctl start climate-tokenization-engine@<USERNAME>
```
For `<USERNAME>`, enter the user that Chia runs as (the user with the `.chia` directory in their home directory).  For example, if the `ubuntu` is where Chia runs, start the Climate Tokenization Engine with `systemctl start climate-tokenization-engine@ubuntu`.

6.  Set the Climate Tokenization Engine to run at boot

```
sudo systemctl enable climate-tokenization-engine@<USERNAME>
```

## Configuration

In the `CHIA_ROOT` directory (usually `~/.chia/mainnet` on Linux), Climate Tokenization Engine will add a directory called `core-registry` when the application is first run (in fact, this directory could be deleted at any time and it will be recreated the next time it is started).  Within that directory, a shared `config.yaml` file can be found that is used by all Core Registry applications.  While the config file likely will contain configs for all Core Registry applications, only the options necessary for Climate Tokenization Engine will be documented here.  The options in this file are as follows:

* **GENERAL**:  
  * **CORE_REGISTRY_MODE**: False (default) when running in stand-alone mode.  True if running embedded as part of the [Core Registry application](https://github.com/Chia-Network/core-registry-api).   
  * **LOG_LEVEL**: All available log levels can be found in the documentation for our [logging module](https://github.com/Chia-Network/core-registry-logger?tab=readme-ov-file#log-levels). Log level `task` (the default) is appropriate for normal use, `debug` when troubleshooting an issue. 
  * **LOG_RETENTION_DAYS**: Default of 30  
  
* **CHIA**:  
  * **DATALAYER_HOST**: Defaults to https://localhost:8562 which is where the Chia DataLayer service RPC runs by default. This should only be changed if Chia is running on a different machine than the Climate Tokenization Engine, or DataLayer is running on a non-standard port.
  * **WALLET_HOST**:  Defaults to https://localhost:9256 which is where the Chia Wallet RPC should be unless specifically running on a non-standard port or on a different machine. 
  * **CERTIFICATE_FOLDER_PATH**: Default of "null" searches the default Chia location for connection certificates.  If running Chia on a remote machine or with a non-standard `CHIA_ROOT`, use this option to provide a path to the Chia certificates.
  * **ALLOW_SELF_SIGNED_CERTIFICATES**: Default of true is appropriate for nearly all circumstances. 
  * **DATALAYER_FILE_SERVER_URL**: Full URL where Chia DataLayer files are served. In order to publish on DataLayer for climate tokenization, Chia must share files at a publicly accessible URL.  This could use the Chia DataLayer HTTP service or something like an S3 bucket.  The full URL, including schema and path, is necessary for any Core Registry applications to share files.  Example: `http://my-datalayer-url.com/`
  * **DEFAULT_FEE**: [Fee](https://docs.chia.net/mempool/) for each transaction on the Chia blockchain in mojos. The default is 300000000 mojos (0.0003 XCH) and can be set higher or lower depending on how [busy](https://dashboard.chia.net/d/46EAA05E/mempool-transactions-and-fees?orgId=1) the Chia network is.  If a fee is set very low, it may cause a delay in transaction processing.  
  * **DEFAULT_COIN_AMOUNT**: Units are mojo. Each DataLayer transaction needs a coin amount, and the default is 300000000 mojo. 
* **TOKENIZATION_ENGINE**
  * **PROTOCOL**: Default `http`. When running multiple Core Registry applications, this is used with the `HOST` configuration to build the URL to make requests to the Tokenization Engine.  Unless the Core Registry applications are running across multiple machines, `http` is likely the correct value. 
  * **HOST**: When running multiple Core Registry applications, this is the host that other applications will use to send API requests to Tokenization Engine.  Unless running Core Registry applications across multiple machines, the default of `127.0.0.1` is likely the correct value.
  * **API_KEY**: Defaults to `null`.  In nearly all scenarios, especially if the Tokenization Engine is going to be accessible outside of this machine, an API key needs to be set to prevent unauthorized tokenization.  Generate a random API key following general password length and complexity best practices. 
  * **PORT**: Port where Tokenization Engine will listen. Default 31311.  
  * **BIND_ADDRESS**: Defaults to localhost.  To make Tokenization Engine available on a public interface, change this to the public IP of the host instance or to `0.0.0.0` to listen on all interfaces.  If this is changed to anything besides localhost, and `API_KEY` must be set to avoid unauthorized access.
  * **UNITS_FILTER**: Most users will want to leave this as the default of `unitStatus:["Retired", "Cancelled", "Expired"]:not`.  
  * **TASKS**:  
    * **SYNC_RETIREMENTS_TO_REGISTRY_INTERVAL_SECONDS**: Retirements are synced at this interval.  To see retirements across your Core Registry suite of applications more quickly, lower this value from the default of 300 seconds.  Syncing will use system resources and users should work towards a balance of fast sync times that the available system resources can support.

## Developer Guide

### Commiting

[Signed commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits) are required. 

​This repo uses a commit convention. A typical commit message might read:
​
```
    fix: correct home screen layout
```
​
The first part of this is the commit "type". The most common types are "feat" for new features, and "fix" for bugfixes. Using these commit types helps us correctly manage our version numbers and changelogs. Since our release process calculates new version numbers from our commits it is very important to get this right.
​

- `feat` is for introducing a new feature
- `fix` is for bug fixes
- `docs` for documentation only changes
- `style` is for code formatting only
- `refactor` is for changes to code which should not be detectable by users or testers
- `perf` is for a code change that improves performance
- `test` is for changes which only touch test files or related tooling
- `build` is for changes which only touch our develop/release tools
- `ci` is for changes to the continuous integration files and scripts
- `chore` is for changes that don't modify code, like a version bump
- `revert` is for reverting a previous commit
  ​

After the type and scope there should be a colon.
 ​

The "subject" of the commit follows. It should be a short indication of the change. The commit convention prefers that this is written in the present-imperative tense.

### Branch Layout

All pull-requests should be made against the `develop` branch.  New releases will be created by merging `develop` into `main`. 
