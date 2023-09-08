const express = require("express");
const cors = require("cors");
const app = express();
const port = 31313;

app.use(cors());

app.get("/v1/activities", (req, res) => {
  if (req.query.page == 1) {
    if (req.query.minHeight > 6000010) {
      res.json({
        activities: [],
      });
    }
    res.json({
      activities: [
        {
          height: 6000000,
          beneficiary_name: "John Doe",
          beneficiary_address: "0x1234",
          amount: 1000000,
          mode: "PERMISSIONLESS_RETIREMENT",
          cw_unit: {
            marketplaceIdentifier:
              "0xf4d61bef9f3022cc2961ca8861c327d104c5e0761cb5fe010d718134d4cd4441",
          },
        },
        {
          height: 6000010,
          beneficiary_name: "JANE Doe",
          beneficiary_address: "0x1234",
          amount: 500000,
          mode: "PERMISSIONLESS_RETIREMENT",
          cw_unit: {
            marketplaceIdentifier:
              "0xf4d61bef9f3022cc2961ca8861c327d104c5e0761cb5fe010d718134d4cd4441",
          },
        },
      ],
    });
  } else {
    res.json({
      activities: [],
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
