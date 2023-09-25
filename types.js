/**
 * @typedef {Object} TokenizationBody
 * @property {Object} token - The token object.
 * @property {string} token.org_uid - The organization UID.
 * @property {string} token.warehouse_project_id - The project ID in the warehouse.
 * @property {number} token.vintage_year - The vintage year of the token.
 * @property {number} token.sequence_num - The sequence number for the token.
 * @property {Object} payment - The payment object.
 * @property {number} payment.amount - The amount to be paid, multiplied by 1000.
 * @property {string} payment.to_address - The address to which the payment is to be sent.
 */

/**
 * @typedef {Object} Tokenization
 * @property {string} mod_hash
 * @property {string} public_key
 */

/**
 * @typedef {Object} Detokenization
 * @property {string} mod_hash
 * @property {string} public_key
 * @property {string} signature
 */

/**
 * @typedef {Object} PermissionlessRetirement
 * @property {string} mod_hash
 * @property {string} signature
 */

/**
 * @typedef {Object} Token
 * @property {string} org_uid
 * @property {string} warehouse_project_id
 * @property {number} vintage_year
 * @property {number} sequence_num
 * @property {string} index
 * @property {string} public_key
 * @property {string} asset_id
 * @property {Tokenization} tokenization
 * @property {Detokenization} detokenization
 * @property {PermissionlessRetirement} permissionless_retirement
 */

/**
 * @typedef {Object} Coin
 * @property {string} parent_coin_info
 * @property {string} puzzle_hash
 * @property {number} amount
 */

/**
 * @typedef {Object} CoinSpends
 * @property {Coin} coin
 * @property {string} puzzle_reveal
 * @property {string} solution
 */

/**
 * @typedef {Object} SpendBundle
 * @property {CoinSpends[]} coin_spends
 * @property {string} aggregated_signature
 */

/**
 * @typedef {Object} TxRecord
 * @property {number} confirmed_at_height
 * @property {number} created_at_time
 * @property {string} to_puzzle_hash
 * @property {number} amount
 * @property {number} fee_amount
 * @property {boolean} confirmed
 * @property {number} sent
 * @property {SpendBundle} spend_bundle
 * @property {Coin[]} additions
 * @property {Coin[]} removals
 * @property {number} wallet_id
 * @property {null} trade_id
 * @property {number} type
 * @property {string} name
 * @property {Array} memos
 */

/**
 * @typedef {Object} Tx
 * @property {string} id
 * @property {TxRecord} record
 */

/**
 * @typedef {Object} TokenCreatedResponse
 * @property {Token} token
 * @property {string} token_hexstr
 * @property {Tx} tx
 */
