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
