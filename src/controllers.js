const _ = require("lodash");
const { logger } = require("./logger");
const wallet = require("./chia/wallet");
const tokenDriver = require("./api/token-driver");
const registry = require("./api/registry");

/**
 * Tokenizes a unit.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
const tokenizeUnit = async (req, res) => {
  try {
    const hasPendingTransactions = await wallet.hasUnconfirmedTransactions();

    if (hasPendingTransactions) {
      return res.status(400).send({
        message: "Please wait for all transactions to confirm.",
        success: false,
      });
    }

    const tokenizationBody = {
      token: {
        org_uid: req.body.org_uid,
        warehouse_project_id: req.body.warehouse_project_id,
        vintage_year: req.body.vintage_year,
        sequence_num: req.body.sequence_num,
      },
      payment: {
        amount: (req.body.amount || 1) * 1000,
        to_address: req.body.to_address,
      },
    };

    const data = await tokenDriver.createToken(tokenizationBody);

    const isTokenCreationPending = Boolean(data?.tx?.id);

    if (isTokenCreationPending) {
      res.send({
        tokenization: data,
        message:
          "Your token is being created and should be ready in a few minutes.",
        success: true,
      });

      const tokenConfirmedOnChain =
        await tokenDriver.waitForTokenizationTransactionConfirmation(
          data.tx.id
        );

      if (tokenConfirmedOnChain) {
        await registry.registerTokenCreationOnRegistry(
          data.token,
          req.body.warehouseUnitId
        );
      } else {
        logger.error(
          "Token creation could not be confirmed. Please check your wallet for stuck transactions."
        );
      }
    } else {
      throw new Error("Token creation could not be initiated.");
    }
  } catch (error) {
    res.status(400).json({
      message: "Error token could not be created",
      error: error.message,
      success: false,
    });
    logger.error(`Error tokenizing: ${error.message}`);
  }
};

/**
 * Parses a Detok file.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
const parseDetokFile = async (req, res) => {
  try {
    let detokString = req.body.detokString;
    detokString = detokString.replace(/(\r\n|\n|\r)/gm, "");
    const detokStringkIsValid =
      typeof detokString === "string" && detokString.startsWith("detok");

    if (!detokStringkIsValid) {
      throw new Error(
        "The uploaded file is not a valid 'detok' format. Please upload a file with the correct format."
      );
    }

    const parseDetokResponse = await tokenDriver.sendParseDetokRequest(
      detokString
    );

    const isDetokParsed = Boolean(parseDetokResponse?.token?.asset_id);
    if (!isDetokParsed) {
      throw new Error(
        "Failed to read the 'detok' file. The file might be corrupted or in an incorrect format."
      );
    }

    const assetId = parseDetokResponse?.token?.asset_id;

    const unitToBeDetokenizedResponse =
      await registry.getTokenizedUnitByAssetId(assetId);

    let unitToBeDetokenized = JSON.parse(unitToBeDetokenizedResponse);
    if (unitToBeDetokenized.length) {
      unitToBeDetokenized = unitToBeDetokenized[0];
    }

    if (parseDetokResponse?.payment?.amount) {
      unitToBeDetokenized.unitCount = parseDetokResponse?.payment?.amount;
    }

    const project = await registry.getProjectByWarehouseProjectId(
      unitToBeDetokenized?.issuance?.warehouseProjectId
    );

    const orgUid = unitToBeDetokenized?.orgUid;

    const orgMetaData = await registry.getOrgMetaData(orgUid);
    const assetIdOrgMetaData = orgMetaData[assetId];
    const parsedAssetIdOrgMetaData = JSON.parse(assetIdOrgMetaData);

    const responseObject = {
      token: {
        org_uid: orgUid,
        project_id: project.projectId,
        vintage_year: unitToBeDetokenized?.vintageYear,
        sequence_num: 0,
        index: parsedAssetIdOrgMetaData?.index,
        public_key: parsedAssetIdOrgMetaData?.public_key,
        asset_id: assetId,
        warehouse_project_id: project.warehouseProjectId,
      },
      content: detokString,
      unit: unitToBeDetokenized,
    };

    res.send(responseObject);
  } catch (error) {
    logger.error(
      `Failed to detokenize the file due to the following error: ${error.message}`
    );

    res.status(400).json({
      message: "File could not be detokenized.",
      error: error.message,
      success: false,
    });
  }
};

/**
 * Confirms Detokanization.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
const confirmDetokanization = async (req, res) => {
  try {
    const confirmDetokanizationBody = _.cloneDeep(req.body);

    const confirmDetokanizationResponse =
      await tokenDriver.confirmDetokanization(confirmDetokanizationBody);

    res.send(confirmDetokanizationResponse);
  } catch (error) {
    res.status(400).json({
      message: "Unable to confirm that the file was successfully detokenized",
      error: error.message,
      success: false,
    });
    logger.error(`Detokanization could not be confirmed: ${error.message}`);
  }
};

/**
 * Processes a detokenization request.
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @returns {Promise<void>}
 */
const processDetokFile = async (req, res) => {
  try {
    let detokString = req.body.detokString;
    detokString = detokString.replace(/(\r\n|\n|\r)/gm, "");

    const isValidDetokString =
      typeof detokString === "string" && detokString.startsWith("detok");
    if (!isValidDetokString) {
      throw new Error("Uploaded file not valid.");
    }

    const parseDetokResponse = await tokenDriver.sendParseDetokRequest(
      detokString
    );
    const isDetokParsed = Boolean(parseDetokResponse?.token?.asset_id);
    if (!isDetokParsed) {
      throw new Error("Could not parse detok file properly.");
    }

    const assetId = parseDetokResponse?.token?.asset_id;
    const unitToBeDetokenizedResponse =
      await registry.getTokenizedUnitByAssetId(assetId);
    let unitToBeDetokenized = JSON.parse(unitToBeDetokenizedResponse);

    if (unitToBeDetokenized.length) {
      unitToBeDetokenized = unitToBeDetokenized[0];
    }

    if (parseDetokResponse?.payment?.amount) {
      unitToBeDetokenized.unitCount = parseDetokResponse?.payment?.amount;
    }

    const project = await registry.getProjectByWarehouseProjectId(
      unitToBeDetokenized?.issuance?.warehouseProjectId
    );
    const orgUid = unitToBeDetokenized?.orgUid;
    const orgMetaData = await registry.getOrgMetaData(orgUid);
    const assetIdOrgMetaData = orgMetaData[assetId];
    const parsedAssetIdOrgMetaData = JSON.parse(assetIdOrgMetaData);

    res.send({
      token: {
        org_uid: orgUid,
        project_id: project.projectId,
        vintage_year: unitToBeDetokenized?.vintageYear,
        sequence_num: 0,
        index: parsedAssetIdOrgMetaData?.index,
        public_key: parsedAssetIdOrgMetaData?.public_key,
        asset_id: assetId,
        warehouse_project_id: project.warehouseProjectId,
      },
      content: detokString,
      unit: unitToBeDetokenized,
    });
  } catch (error) {
    res.status(400).json({
      message: "File could not be detokenized.",
      error: error.message,
      success: false,
    });
    logger.error(`File could not be detokenized: ${error.message}`);
  }
};

/**
 * Confirms the detokenization process.
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @returns {Promise<void>}
 */
const confirmDetokProcess = async (req, res) => {
  try {
    const confirmDetokanizationResponse =
      await tokenDriver.confirmDetokanization(req.body);
    res.send(confirmDetokanizationResponse);
  } catch (error) {
    res.status(400).json({
      message: "Detokanization could not be confirmed.",
      error: error.message,
      success: false,
    });
    logger.error(`Detokanization could not be confirmed: ${error.message}`);
  }
};

module.exports = {
  tokenizeUnit,
  parseDetokFile,
  confirmDetokanization,
  processDetokFile,
  confirmDetokProcess,
};
