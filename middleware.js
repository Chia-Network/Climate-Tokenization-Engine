const { hasUnconfirmedTransactions } = require("./chia/wallet");

export const assertNoPendingTransactions = async (req, res, next) => {
  const hasPendingTransactions = await hasUnconfirmedTransactions();

  if (hasPendingTransactions) {
    return res.status(400).send({
      success: false,
      message: "Please wait for all transactions to confirm.",
    });
  }

  next();
};
