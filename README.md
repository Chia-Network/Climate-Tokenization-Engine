# Climate Tokenization Engine

The Climate Tokenization Engine is open source software that allows carbon registries to be able to tokenize existing carbon credit units onto a public blockchain. 

By using the Climate Tokenization Engine, registries are able to control what gets tokenized, and can easily track on chain activity for any created tokens. This gives the registry ultimate control over the data to ensure the registry is able to maintain data integrity, while engaging with expanded markets that exist on blockchain.

This application integrates closely with the [Climate Action Data Trust](https://github.com/Chia-Network/cadt) application and was developed to integrate with the [Chia Blockchain](https://github.com/Chia-Network/chia-blockchain.)  A graphical user interface is available with the [Climate Tokenization Engine User Interface](https://github.com/Chia-Network/Climate-Tokenization-Engine-UI).

*Note that this application was previously known as the Climate Portal.*

## Installation

Precompiled packages are available for MacOS, Windows, and Debian-based Linux distros on the [releases](https://github.com/Chia-Network/Climate-Tokenization-Engine/releases) page. 

## Developer Guide

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
- `test` is for changes which only touch test files or related tooling
- `build` is for changes which only touch our develop/release tools
  ​
  After the type and scope there should be a colon.
  ​
  The "subject" of the commit follows. It should be a short indication of the change. The commit convention prefers that this is written in the present-imperative tense.

  All pull-requests should be made against the `develop` branch.  New releases will be created by merging `develop` into `main`. 
