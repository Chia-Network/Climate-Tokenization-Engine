# Climate Tokenization Engine

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

In the `CHIA_ROOT` directory (usually `~/.chia/mainnet` on Linux), Climate Tokenization Engine will add a directory called `climate-tokenization-engine` when the application is first run (in fact, this directory could be deleted at any time and it will be recreated the next time it is started).  The main Climate Tokenization Engine configuration file is called `config.yaml` and can be found in this directory.  The options in this file are as follows:

* **DATA_LAYER_HOST**: Defaults to https://localhost:8562 which is where the Chia DataLayer service should be running. This should only be changed if Chia is running on a different machine than the Climate Tokenization Engine, or DataLayer is running on a non-standard port.
* **CLIMATE_TOKENIZATION_ENGINE_API_KEY**: Set the API key used to access the Climate Tokenization Engine service. This is useful if you plan to use the [Climate Tokenization Engine User Interface](https://github.com/Chia-Network/Climate-Tokenization-Engine-UI) remotely to access the service.
* **CADT_API_SERVER_HOST**: Defaults to localhost. It is strongly recommended to run the Climate Tokenization Engine on the same machine as the CADT API server.
* **CADT_API_KEY**: If your CADT API server is protected with an API key, add the same key here so the Climate Tokenization Engine can make the proper requests to the CADT service.
* **CLIMATE_TOKENIZATION_CHIA_HOST**: Defaults to localhost. It is strongly recommended to run the Climate Tokenization Engine on the same machine as the Climate Tokenization Chia host.
* **CLIMATE_TOKENIZATION_ENGINE_PORT** Specifiy the port that Climate Tokenization Engine runs on.
* **CORE_REGISTRY_MODE**: Defaults to `FALSE`. Set this parameter to `TRUE` if you'd like CADT to automatically be updated when tokenization occurs.
* **UNITS_FILTER**: This parameter determines which carbon units in CADT will show up as available to be tokenized in the Climate Tokenization Engine. By default, `Retired` `Cancelled` and `Expired` units will not be displayed as available to tokenize in the Climate Tokenization Engine.
* **LOG_LEVEL**: Determines the amount of logs that get written by the service. Defaults to `INFO`, but can be set to `DEBUG` if necessary.
* **LOG_RETENTION_DAYS**: Defaults to `30` days, but can be set lower or higher, depending on log needs.

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
