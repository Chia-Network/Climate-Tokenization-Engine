# Climate Portal RPC API

This page lists commands and examples from the Climate Portal RPC API.

## Commands

* [`connect`](#connect)
* [`tokenized`](#tokenized)
* [`untokenized`](#untokenized)
* [`projects`](#projects)
* [`tokenize`](#tokenize)
* [`parse-detok-file`](#parse-detok-file)
* [`confirm-detokenization`](#confirm-detokenization)

---

## Reference

## `connect`

Functionality: Connect to the organization with the specified orgUid

POST Options:

| Key    | Type   | Required | Description                              |
|:-------|:-------|:---------|:-----------------------------------------|
| orgUid | String | True     | orgUid of the organization to connect to |

### POST Examples

#### Connect to a specific organization

Request:
```json
curl --location -g --request POST '34.209.61.105:31311/connect' --header 'Content-Type: application/json' --data-raw '{"orgUid":"119bf475dcacba64a2802fbefe0c685cbe735e9ef9fc4b24b0c382e5854ce7b4" }'
```

Response:
```json
{
  "message":"successfully connected"
}
```

---

## `tokenized`

Functionality: List blocks of units that have already been tokenized

GET Options:

| Key                        | Type    | Required  | Description                                                                                  |
|:---------------------------|:--------|:----------|:---------------------------------------------------------------------------------------------|
| hasMarketplaceIdentifier   | Boolean | False     | If `true`, then only show results where `marketplaceIdentifier` has been set [Default: true] |
| orgUid                     | String  | False     | Only show results matching the specified `orgUid`                                            |
| includeProjectInfoInSearch | Boolean | False     | If `true`, then include project info in the results [Default: true]                          |

### GET Examples

#### List all tokenized blocks of units

```json
// Request
curl --location --request GET '34.209.61.105:31311/units/tokenized' --header 'Content-Type: application/json'
```

```json
// Response
[
  {
    "warehouseUnitId":"e4ebc9aa-27ab-4d50-8ef9-f1009cc8e18b",
    "issuanceId":"192f45f2-07d7-40f3-b4a7-64c120a2b3ab",
    "projectLocationId":null,
    "orgUid":"119bf475dcacba64a2802fbefe0c685cbe735e9ef9fc4b24b0c382e5854ce7b4",
    "unitOwner":null,
    "countryJurisdictionOfOwner":"Colombia",
    "inCountryJurisdictionOfOwner":null,
    "serialNumberBlock":"1-1300",
    "unitBlockStart":"1",
    "unitBlockEnd":"1300",
    "unitCount":1300,
    "vintageYear":2022,
    "unitType":"Reduction - technical",
    "marketplace":null,
    "marketplaceLink":"bls123819a4sutgIs6dy7elfzkl9rrvyacc02umk5sqpzhh4r0essnnjj3ls7ee5qs",
    "marketplaceIdentifier":"0x9856b36484a0b92481f1f7632f08f1fb66083088167c81bd19a06fa12433e77c",
    "unitTags":null,
    "unitStatus":"Retired",
    "unitStatusReason":null,
    "unitRegistryLink":"www.google.com",
    "correspondingAdjustmentDeclaration":"Committed",
    "correspondingAdjustmentStatus":"Not Started",
    "timeStaged":null,
    "createdAt":"2023-04-12T19:03:51.565Z",
    "updatedAt":"2023-04-12T19:03:51.565Z",
    "labels":[],
    "issuance":{
      "id":"192f45f2-07d7-40f3-b4a7-64c120a2b3ab",
      "orgUid":"119bf475dcacba64a2802fbefe0c685cbe735e9ef9fc4b24b0c382e5854ce7b4",
      "warehouseProjectId":"f577afa2-63a6-4d55-9197-63ca391dbe91",
      "startDate":"2022-01-01T00:00:00.000Z",
      "endDate":"2022-12-31T00:00:00.000Z",
      "verificationApproach":"details on website",
      "verificationReportDate":"2023-01-18T00:00:00.000Z",
      "verificationBody":"Agri-Waste Technology, Inc.",
      "timeStaged":null,
      "createdAt":"2023-04-12T19:03:51.565Z",
      "updatedAt":"2023-04-12T19:03:51.565Z"
    }
  },
  {
    "warehouseUnitId":"47bf3062-acf6-4eeb-97ec-4c653aac0704",
    "issuanceId":"192f45f2-07d7-40f3-b4a7-64c120a2b3ab",
    "projectLocationId":null,
    "orgUid":"119bf475dcacba64a2802fbefe0c685cbe735e9ef9fc4b24b0c382e5854ce7b4",
    "unitOwner":null,
    "countryJurisdictionOfOwner":"Colombia",
    "inCountryJurisdictionOfOwner":null,
    "serialNumberBlock":"1301-15000",
    "unitBlockStart":"1301",
    "unitBlockEnd":"15000",
    "unitCount":13700,
    "vintageYear":2022,
    "unitType":"Reduction - technical",
    "marketplace":null,
    "marketplaceLink":null,
    "marketplaceIdentifier":"0x9856b36484a0b92481f1f7632f08f1fb66083088167c81bd19a06fa12433e77c",
    "unitTags":null,
    "unitStatus":"Held",
    "unitStatusReason":null,
    "unitRegistryLink":"www.google.com",
    "correspondingAdjustmentDeclaration":"Committed",
    "correspondingAdjustmentStatus":"Not Started",
    "timeStaged":null,
    "createdAt":"2023-04-12T17:04:14.347Z",
    "updatedAt":"2023-04-12T17:04:14.347Z",
    "labels":[],
    "issuance":{
      "id":"192f45f2-07d7-40f3-b4a7-64c120a2b3ab",
      "orgUid":"119bf475dcacba64a2802fbefe0c685cbe735e9ef9fc4b24b0c382e5854ce7b4",
      "warehouseProjectId":"f577afa2-63a6-4d55-9197-63ca391dbe91",
      "startDate":"2022-01-01T00:00:00.000Z",
      "endDate":"2022-12-31T00:00:00.000Z",
      "verificationApproach":"details on website",
      "verificationReportDate":"2023-01-18T00:00:00.000Z",
      "verificationBody":"Agri-Waste Technology, Inc.",
      "timeStaged":null,
      "createdAt":"2023-04-12T19:03:51.565Z",
      "updatedAt":"2023-04-12T19:03:51.565Z"
    }
  }
]
```

---

## `untokenized`

Functionality: List blocks of units that have not yet been tokenized

GET Options:

| Key                        | Type    | Required  | Description                                                                                  |
|:---------------------------|:--------|:----------|:---------------------------------------------------------------------------------------------|
| hasMarketplaceIdentifier   | Boolean | False     | If `true`, then only show results where `marketplaceIdentifier` has been set [Default: true] |
| orgUid                     | String  | False     | Only show results matching the specified `orgUid`                                            |
| includeProjectInfoInSearch | Boolean | False     | If `true`, then include project info in the results [Default: true]                          |
| filter                     | String  | False     | Only display results that contain the specified query (case insensitive)                     |

### GET Examples

#### List all tokenized blocks of units

```json
// Request
curl --location -g --request GET '34.209.61.105:31311/units/untokenized' --header 'Content-Type: application/json'
```

```json
// Response
[
  {
    "warehouseUnitId":"eebfb657-0fcd-4155-8c8a-01a7304a7b40",
    "issuanceId":"192f45f2-07d7-40f3-b4a7-64c120a2b3ab",
    "projectLocationId":null,
    "orgUid":"119bf475dcacba64a2802fbefe0c685cbe735e9ef9fc4b24b0c382e5854ce7b4",
    "unitOwner":null,
    "countryJurisdictionOfOwner":"Colombia",
    "inCountryJurisdictionOfOwner":null,
    "serialNumberBlock":"1-20000",
    "unitBlockStart":"1",
    "unitBlockEnd":"20000",
    "unitCount":20000,
    "vintageYear":2024,
    "unitType":"Reduction - technical",
    "marketplace":null,
    "marketplaceLink":null,
    "marketplaceIdentifier":null,
    "unitTags":null,
    "unitStatus":"Held",
    "unitStatusReason":null,
    "unitRegistryLink":"www.google.com",
    "correspondingAdjustmentDeclaration":"Committed",
    "correspondingAdjustmentStatus":"Not Started",
    "timeStaged":"1681326074",
    "createdAt":"2023-04-12T19:03:51.566Z",
    "updatedAt":"2023-04-12T19:03:51.566Z",
    "labels":[],
    "issuance":{
      "id":"192f45f2-07d7-40f3-b4a7-64c120a2b3ab",
      "orgUid":"119bf475dcacba64a2802fbefe0c685cbe735e9ef9fc4b24b0c382e5854ce7b4",
      "warehouseProjectId":"f577afa2-63a6-4d55-9197-63ca391dbe91",
      "startDate":"2022-01-01T00:00:00.000Z",
      "endDate":"2022-12-31T00:00:00.000Z",
      "verificationApproach":"details on website",
      "verificationReportDate":"2023-01-18T00:00:00.000Z",
      "verificationBody":"Agri-Waste Technology, Inc.",
      "timeStaged":null,
      "createdAt":"2023-04-12T19:03:51.565Z",
      "updatedAt":"2023-04-12T19:03:51.565Z"
    }
  }
]
```

---

## `projects`

Functionality: List projects

GET Options:

| Key                        | Type    | Required  | Description                                                                                  |
|:---------------------------|:--------|:----------|:---------------------------------------------------------------------------------------------|
| orgUid                     | String  | False     | Only show results matching the specified `orgUid`                                            |

### GET Examples

#### List all projects

```json
// Request
curl --location --request GET '34.209.61.105:31311/projects' --header 'Content-Type: application/json'
```

```json
// Response
[
  {
    "warehouseProjectId":"f577afa2-63a6-4d55-9197-63ca391dbe91",
    "orgUid":"119bf475dcacba64a2802fbefe0c685cbe735e9ef9fc4b24b0c382e5854ce7b4",
    "currentRegistry":"EcoRegistry",
    "projectId":"eco123",
    "originProjectId":"eco123",
    "registryOfOrigin":"EcoRegistry",
    "program":null,
    "projectName":"Cookstove Replacement",
    "projectLink":"https://drawdown.org/solutions/improved-clean-cookstoves/technical-summary",
    "projectDeveloper":"Developer1",
    "sector":"Electricity; gas, steam and air conditioning supply",
    "projectType":"Energy Demand",
    "projectTags":null,
    "coveredByNDC":"Inside NDC",
    "ndcInformation":null,
    "projectStatus":"Completed",
    "projectStatusDate":"2023-04-11T00:00:00.000Z",
    "unitMetric":"tCO2e",
    "methodology":"CDM - AM0018",
    "methodology2":null,
    "validationBody":"Agri-Waste Technology, Inc.",
    "validationDate":null,
    "timeStaged":"1681318172",
    "description":null,
    "createdAt":"2023-04-12T19:03:51.564Z",
    "updatedAt":"2023-04-12T19:03:51.564Z",
    "projectLocations":[],
    "labels":[],
    "issuances":[
      {
        "id":"192f45f2-07d7-40f3-b4a7-64c120a2b3ab",
        "orgUid":"119bf475dcacba64a2802fbefe0c685cbe735e9ef9fc4b24b0c382e5854ce7b4",
        "warehouseProjectId":"f577afa2-63a6-4d55-9197-63ca391dbe91",
        "startDate":"2022-01-01T00:00:00.000Z",
        "endDate":"2022-12-31T00:00:00.000Z",
        "verificationApproach":"details on website",
        "verificationReportDate":"2023-01-18T00:00:00.000Z",
        "verificationBody":"Agri-Waste Technology, Inc.",
        "timeStaged":null,
        "createdAt":"2023-04-12T19:03:51.565Z",
        "updatedAt":"2023-04-12T19:03:51.565Z"
      }
    ],
    "coBenefits":[],
    "relatedProjects":[],
    "projectRatings":[],
    "estimations":[]
  }
]
```

---

## `tokenize`

Functionality: Create tokens from an untokenized block of units

POST Options:

| Key                  | Type    | Required | Description                                                                                  |
|:---------------------|:--------|:---------|:---------------------------------------------------------------------------------------------|
| org_uid              | String  | True     | The `orgUid` of the block to tokenize                                            |
| warehouseUnitId      | String  | True     | The `warehouseUnitId` of the block to tokenize
| warehouse_project_id | String  | True     | The `warehouseProjectId` of the block to tokenize
| vintage_year         | Number  | True     | The `vintageYear` of the block to tokenize
| sequence_num         | Number  | True     | The `sequenceNum` of the block to tokenize
| to_address           | String  | True     | The address to send the tokens to
| amount               | Number  | True     | The number of tokens to create

### POST Examples

#### Create 1000 tokens

Request:
```json
curl --location -g --request POST '34.209.61.105:31311/tokenize' --header 'Content-Type: application/json' --data-raw '{"org_uid":"119bf475dcacba64a2802fbefe0c685cbe735e9ef9fc4b24b0c382e5854ce7b4", "warehouseUnitId":"eebfb657-0fcd-4155-8c8a-01a7304a7b40", "warehouse_project_id":"f577afa2-63a6-4d55-9197-63ca391dbe91", "vintage_year":2024, "sequence_num":1, "to_address": "txch1dlapac66f8gcy9d7fhzuqrjnms4fnwrya4crzp6t9u7s8cs5jk6q4td3qd", "amount":1000 }'
```

Response:
```json

```


---

## `parse-detok-file`

Functionality: Validate a detokanization request file and return its contents

POST Options: 


### POST Examples

Request:

```json

```

Response:

```json

```

---

## `confirm-detokanization`

Functionality: Confirm that detokanization has occurred

POST Options: None

### POST Examples

Request:

```json
curl --location -g --request POST '34.209.61.105:31311/confirm-detokanization' --header 'Content-Type: application/json'
```

Response:

```json

```