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

### Example

This example will go through the process of finding a project to tokenize, splitting a block to create the exact number of units to tokenize, tokenizing the units, and updating the CADT to show the correct information.

Note that this example has many steps, several of which use example values for the fields. Be sure to change the values with your local information when running these commands.

### List untokenized assets

First, list all assets that have not been tokenized. Note that only the relevant asset for this example will be displayed in full.

Request:
```json
curl --location -g --request GET 'localhost:31311/units/untokenized' --header 'Content-Type: application/json'
```

Response:
```json
[
  {
    "warehouseUnitId":"bd909680-95f1-40b8-a512-7e5362204f8f",
    // Abbreviated
    }
  },{
    "warehouseUnitId":"eebfb657-0fcd-4155-8c8a-01a7304a7b40",
    // Abbreviated
  },{
    "warehouseUnitId":"143271a8-7c36-49f0-b6bc-49c184dfb13b",
    "issuanceId":"192f45f2-07d7-40f3-b4a7-64c120a2b3ab",
    "projectLocationId":null,
    "orgUid":"119bf475dcacba64a2802fbefe0c685cbe735e9ef9fc4b24b0c382e5854ce7b4",
    "unitOwner":null,
    "countryJurisdictionOfOwner":"Colombia",
    "inCountryJurisdictionOfOwner":null,
    "serialNumberBlock":"5001-19000",
    "unitBlockStart":"5001",
    "unitBlockEnd":"19000",
    "unitCount":14000,
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
    "createdAt":"2023-04-18T21:16:53.607Z",
    "updatedAt":"2023-04-18T21:16:53.607Z",
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
      "createdAt":"2023-04-24T02:59:29.624Z",
      "updatedAt":"2023-04-24T02:59:29.624Z"
    }
  }
]
```

### Split into multiple records

Note: If the asset record you want to tokenize already has the desired `unitCount`, you can skip to the [tokenization step](#tokenize-an-asset-record).

For this example, let's say you only want to tokenize 1000 units. The record listed above has 14,000 units (`"unitCount":14000,`). It is only possible to tokenize the entire record, so you must first split it into multiple records.

Request:
```json
curl --location --request POST 'localhost:31310/v1/units/split' \
--header 'Content-Type: application/json' \
--data-raw '{
  "warehouseUnitId": "143271a8-7c36-49f0-b6bc-49c184dfb13b",
  "records": [{
    "unitBlockStart": "5001",
    "unitBlockEnd": "18000",
    "unitCount": 13000
   }, {
    "unitBlockStart": "18001",
    "unitBlockEnd": "19000",
    "unitCount": 1000
   }
  ]
}'
```

Response:
```json
{"message":"Unit split successful"}
```

This will create two asset records, one with 13,000 units and one with 1000 units. However, you still need to commit the changes in order for the split to take effect.

Request:
```json
curl --location --request POST \
     --header 'Content-Type: application/json' \
     'localhost:31310/v1/staging/commit'
```

Response:
```json
{"message":"Staging Table committed to full node"}
```

### List untokenized assets again

There is now an asset with 1000 units, which you can show by rerunning the `untokenized` command:

Request:
```json
curl --location -g --request GET '34.209.61.105:31311/units/untokenized' --header 'Content-Type: application/json'
```

Response:
```json
[
  {
    "warehouseUnitId":"bd909680-95f1-40b8-a512-7e5362204f8f",
    // Abbreviated
  },{
    "warehouseUnitId":"eebfb657-0fcd-4155-8c8a-01a7304a7b40",
    // Abbreviated
  },{
    "warehouseUnitId":"143271a8-7c36-49f0-b6bc-49c184dfb13b",
    // Abbreviated
  },{
    "warehouseUnitId":"8de4f10c-0ffb-44dd-b79a-0e85bbd2f89c",
    "issuanceId":"192f45f2-07d7-40f3-b4a7-64c120a2b3ab",
    "projectLocationId":null,
    "orgUid":"119bf475dcacba64a2802fbefe0c685cbe735e9ef9fc4b24b0c382e5854ce7b4",
    "unitOwner":null,
    "countryJurisdictionOfOwner":"Colombia",
    "inCountryJurisdictionOfOwner":null,
    "serialNumberBlock":"18001-19000",
    "unitBlockStart":"18001",
    "unitBlockEnd":"19000",
    "unitCount":1000,
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
    "createdAt":"2023-04-18T21:16:53.607Z",
    "updatedAt":"2023-04-18T21:16:53.607Z",
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
      "createdAt":"2023-04-24T02:59:29.624Z",
      "updatedAt":"2023-04-24T02:59:29.624Z"
    }
  }
]
```

### Tokenize an asset record

You can use the information above to create 1000 tokens from the asset record and send them to a txch (or xch) address of your choosing. Note that each of the fields in this example are required.

Request:
```json
curl --location -g --request POST 'localhost:31311/tokenize' \
--header 'Content-Type: application/json' \
--data-raw '{
  "org_uid":"119bf475dcacba64a2802fbefe0c685cbe735e9ef9fc4b24b0c382e5854ce7b4", 
  "warehouseUnitId":"8de4f10c-0ffb-44dd-b79a-0e85bbd2f89c", 
  "warehouse_project_id":"f577afa2-63a6-4d55-9197-63ca391dbe91", 
  "vintage_year":2024, 
  "sequence_num":0, 
  "to_address":"txch17wxmtffg48mgnuns0egysccdhhp55uaslqncerm4k4nrhafzd2ksvc9su4", 
  "amount":1000 
}'
```

Response:
```json
Your token is being created and should be ready in a few minutes.
```

### Obtain the new Asset ID

The tokenization backend will show the TAIL information for the new tokenzied asset:

```json
2023-04-24:05:10:34,862 INFO     [wallet.py:101] Creating climate wallet for
2023-04-24:05:10:34,862 INFO     [wallet.py:102]   - Token index: 601396f37897f2d94b5170dd7231c67761f42ba7ec6ab543d36b947d78a4deea
2023-04-24:05:10:34,862 INFO     [wallet.py:103]   - Asset ID: a0becef7dd659be168a8b5267cb77c235130e3406ab9872d9b6400ceb7bde6c4
2023-04-24:05:10:34,878 INFO     [wallet.py:130] Signing delegated tail for mode `TOKENIZATION`:
2023-04-24:05:10:34,878 INFO     [wallet.py:131]   - Public key: b0f0c9c5f0558850352ef6af255443fd983b9fce0f06b8c8b2dc3452f3aa076798239d185eb48b505e43e5b78daa680e
2023-04-24:05:10:34,878 INFO     [wallet.py:132]   - Delegated puzzle hash: 21cf2c5adcf55fd268bf03b302a642097bcc7e5e28bbe9a47e3a48691ba51c24
2023-04-24:05:10:34,878 INFO     [wallet.py:133]   - Message: bc9bc147e458578c2925867af96f9496f359d5cd733954c5011f0561e8677449
2023-04-24:05:10:34,878 INFO     [wallet.py:134]   - Signature: b0ffd5dc5deae0cc24f6fe0c282d59410691ac41da6f25900b554a1a3e7e57c9be29fd24c4f3795aa7e07a8c2a09ff8300b78288bbce1bc6003e4a99b791c6d47548cf81b1a89e66761d8ea9e6d3ff09dc504cce10ba36435e4646a34ee33f73
2023-04-24:05:10:34,878 INFO     [wallet.py:130] Signing delegated tail for mode `DETOKENIZATION`:
2023-04-24:05:10:34,878 INFO     [wallet.py:131]   - Public key: a40d1a5549ea6481fe22dcb3fcecd1b04972a4eb613a7e61e5729683542494eb15afbb798753ce105ada6053626ce3fb
2023-04-24:05:10:34,878 INFO     [wallet.py:132]   - Delegated puzzle hash: a1c41f4c0bf08b077d49c6361d3632a6bb209892baf35fce875d133e83796be3
2023-04-24:05:10:34,878 INFO     [wallet.py:133]   - Message: 60e8e208528cdb887db208ccc745a2371e61d49bebf856c2e892a5b084cc134d
2023-04-24:05:10:34,878 INFO     [wallet.py:134]   - Signature: 8cc276177593509830891ad2228231fb67d40ed8732d8b3a53eae49931ed48fcf3a860837b81489ca0d0a4ef89f1799808a75e384bdc69f2917e8c642e8e1701bc7682654d97be1452cbe7ca7c4315ab70bee09be7958cf640fbd1b4ca8b2ec1
2023-04-24:05:10:34,893 INFO     [wallet.py:130] Signing delegated tail for mode `PERMISSIONLESS_RETIREMENT`:
2023-04-24:05:10:34,893 INFO     [wallet.py:131]   - Public key: a4fa9c1c5463604e55b7de54cb3be9ce928e93dbddeb5bae0f4ccff16ce6081c63b886314349b3db550b1ee6e900e014
2023-04-24:05:10:34,893 INFO     [wallet.py:132]   - Delegated puzzle hash: b85ed82b1e628bb028d0a67408ca78de860b43faabd7d533c6ccd9d48db25db1
2023-04-24:05:10:34,893 INFO     [wallet.py:133]   - Message: 50a646de7eda4e188f159c7da98fe524f611b0853cd333c3fe40dbdc7d388312
2023-04-24:05:10:34,893 INFO     [wallet.py:134]   - Signature: a1bc9ae33957d508bc7d03fd5a362a6d64b499389c84b3cfe34c8de1e273f6fee8069202be05f6a6639d5ec16ecd365a0304883ca6bdccb55fa4365a210f9a62f06e3cfa2ae9d8e334c02419fb90d8c70e153122f692d12ffb61d94886db1f39
2023-04-24:05:10:34,956 INFO     [wallet.py:386] Creating transaction for mode TOKENIZATION:
2023-04-24:05:10:34,956 INFO     [wallet.py:387]   - Recipient: f38db5a528a9f689f2707e5048630dbdc34a73b0f8278c8f75b5663bf5226aad
2023-04-24:05:10:34,972 INFO     [wallet.py:388]   - Amount: 1000000
2023-04-24:05:10:34,972 INFO     [wallet.py:389]   - Fee: 1000000000
```

You need the `Asset ID`, which is `a0becef7dd659be168a8b5267cb77c235130e3406ab9872d9b6400ceb7bde6c4` in this example. This ID will be used in the next step.

### Verify the token creation

The transactions to create the tokens should be completed within 5 minutes of running the `tokenize` command.

To verify this, use the `chia wallet show` command to view your Chia wallet. If the `chia` command is not found, follow [these instructions](https://docs.chia.net/faq#i-installed-chia-with-the-packaged-installer-how-do-i-run-cli-commands) to create an alias.

Request:
```bash
chia wallet show
```

Response:
```bash
Wallet height: 2534548
Sync status: Synced
Balances, fingerprint: 4148935256

Chia Wallet:
   -Total Balance:         10.975379390996 txch (10975379390996 mojo)
   -Pending Total Balance: 10.975379390996 txch (10975379390996 mojo)
   -Spendable:             10.975379390996 txch (10975379390996 mojo)
   -Type:                  STANDARD_WALLET
   -Wallet ID:             1

// Abbreviated

CAT a0becef7dd659be1...:
   -Total Balance:         1000.0  (1000000 mojo)
   -Pending Total Balance: 1000.0  (1000000 mojo)
   -Spendable:             1000.0  (1000000 mojo)
   -Type:                  CAT
   -Asset ID:              a0becef7dd659be168a8b5267cb77c235130e3406ab9872d9b6400ceb7bde6c4
   -Wallet ID:             11
```

Among the listed assets, you should see the `Asset ID` you identified from the previous command, and it should contain the correct balance (`1000.0`) in this example.

Note that if you have previously tokenized units within the same project, your CAT balance might be higher.

### Update the CADT

The tokens have been created, but the CADT still needs to be updated. To do this, run the `units` PUT command.

The following example uses the minimum required fields for this command, along with a few extras:
* `marketplace` -- can be any message
* `marketplaceIdentifier` -- the `Asset ID` of the tokens (identified in the previous step), prefixed with `0x`
* `issuance` -- the issuance for this asset; be sure to use each of the fields from this example in order to preserve them

Request:
```json
curl --location -g --request PUT 'localhost:31310/v1/units' \
 --header 'Content-Type: application/json' \
 --data-raw '{
    "warehouseUnitId":"8de4f10c-0ffb-44dd-b79a-0e85bbd2f89c",
    "countryJurisdictionOfOwner": "Colombia",
    "unitBlockStart":"18001",
    "unitBlockEnd":"19000",
    "unitCount":1000,
    "vintageYear":2024,
    "unitType":"Reduction - technical",
    "unitStatus":"Held",
    "unitRegistryLink":"www.google.com",
    "correspondingAdjustmentDeclaration":"Committed",
    "correspondingAdjustmentStatus":"Not Started",
    "marketplace":"Tokenized on Chia",
    "marketplaceIdentifier":"0xa0becef7dd659be168a8b5267cb77c235130e3406ab9872d9b6400ceb7bde6c4",
    "issuance":{
      "id":"192f45f2-07d7-40f3-b4a7-64c120a2b3ab",
      "warehouseProjectId":"f577afa2-63a6-4d55-9197-63ca391dbe91",
      "startDate":"2022-01-01T00:00:00.000Z",
      "endDate":"2022-12-31T00:00:00.000Z",
      "verificationApproach":"details on website",
      "verificationReportDate":"2023-01-18T00:00:00.000Z",
      "verificationBody":"Agri-Waste Technology, Inc."
    }
}'
```

Response:
```json
{"message":"Unit update added to staging"}
```

Once again, you have to commit the change for it to take effect:

Request:
```json
curl --location --request POST \
     --header 'Content-Type: application/json' \
     'localhost:31310/v1/staging/commit'
```

Response:
```json
{"message":"Staging Table committed to full node"}
```

### Show tokenized units

Request:
```json
curl --location --request GET 'localhost:31311/units/tokenized' --header 'Content-Type: application/json'
```

Response:

```json
[
  {
    "warehouseUnitId":"ab46bb7e-2bda-4fe1-acc2-581b10f1fe2a",
    // Abbreviated
  },{
    "warehouseUnitId":"e4ebc9aa-27ab-4d50-8ef9-f1009cc8e18b",
    // Abbreviated
  },{
    "warehouseUnitId":"47bf3062-acf6-4eeb-97ec-4c653aac0704",
    // Abbreviated
  },{
    "warehouseUnitId":"8de4f10c-0ffb-44dd-b79a-0e85bbd2f89c",
    "issuanceId":"192f45f2-07d7-40f3-b4a7-64c120a2b3ab",
    "projectLocationId":null,
    "orgUid":"119bf475dcacba64a2802fbefe0c685cbe735e9ef9fc4b24b0c382e5854ce7b4",
    "unitOwner":null,
    "countryJurisdictionOfOwner":"Colombia",
    "inCountryJurisdictionOfOwner":null,
    "serialNumberBlock":"18001-19000",
    "unitBlockStart":"18001",
    "unitBlockEnd":"19000",
    "unitCount":1000,
    "vintageYear":2024,
    "unitType":"Reduction - technical",
    "marketplace":"Tokenized on Chia",
    "marketplaceLink":null,
    "marketplaceIdentifier":"0xa0becef7dd659be168a8b5267cb77c235130e3406ab9872d9b6400ceb7bde6c4",
    "unitTags":null,
    "unitStatus":"Held",
    "unitStatusReason":null,
    "unitRegistryLink":"www.google.com",
    "correspondingAdjustmentDeclaration":"Committed",
    "correspondingAdjustmentStatus":"Not Started",
    "timeStaged":null,
    "createdAt":"2023-04-24T07:19:33.789Z",
    "updatedAt":"2023-04-24T07:19:33.789Z",
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
      "createdAt":"2023-04-24T07:19:33.776Z",
      "updatedAt":"2023-04-24T07:19:33.776Z"
    }
  }
]
```

This last command shows that the tokenization was successful.

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