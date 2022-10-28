const unzipper = require("unzipper");

const unzipAndUnlockZipFile = async (filepath, password) => {
  try {
    const zipDirectory = await unzipper.Open.file(filepath);
    const file = zipDirectory.files[0];

    const extracted = await file.buffer(password);

    return extracted;
  } catch {
    throw new Error("Could not decompress file.");
  }
};

module.exports = { unzipAndUnlockZipFile };
