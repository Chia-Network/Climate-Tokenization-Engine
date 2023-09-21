const {
  sendParseDetokRequest,
  confirmDetokanization,
} = require("./tokenization");
const {
  getTokenizedUnitByAssetId,
  getProjectByWarehouseProjectId,
  getOrgMetaData,
} = require("./utils");
const logger = require("./logger");

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

    const parseDetokResponse = await sendParseDetokRequest(detokString);
    const isDetokParsed = Boolean(parseDetokResponse?.token?.asset_id);
    if (!isDetokParsed) {
      throw new Error("Could not parse detok file properly.");
    }

    const assetId = parseDetokResponse?.token?.asset_id;
    const unitToBeDetokenizedResponse = await getTokenizedUnitByAssetId(
      assetId
    );
    let unitToBeDetokenized = JSON.parse(unitToBeDetokenizedResponse);

    if (unitToBeDetokenized.length) {
      unitToBeDetokenized = unitToBeDetokenized[0];
    }

    if (parseDetokResponse?.payment?.amount) {
      unitToBeDetokenized.unitCount = parseDetokResponse?.payment?.amount;
    }

    const project = await getProjectByWarehouseProjectId(
      unitToBeDetokenized?.issuance?.warehouseProjectId
    );
    const orgUid = unitToBeDetokenized?.orgUid;
    const orgMetaData = await getOrgMetaData(orgUid);
    const assetIdOrgMetaData = orgMetaData[`meta_${assetId}`];
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
    const confirmDetokanizationResponse = await confirmDetokanization(req.body);
    res.send(confirmDetokanizationResponse);
  } catch (error) {
    res.status(400).json({
      message: "Detokanization could not be confirmed.",
      error: error.message,
    });
    logger.error(`Detokanization could not be confirmed: ${error.message}`);
  }
};

module.exports = {
  processDetokFile,
  confirmDetokProcess,
};
