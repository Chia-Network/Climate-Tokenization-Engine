const express = require("express");
const cors = require("cors");
const app = express();
const port = 31313;

app.use(cors());

app.get("/v1/activities", (req, res) => {
  if (req.query.page == 1) {
    if (req.query.minHeight > 6000010) {
      res.json({
        total: 0,
        activities: [],
      });
    }
    res.json({
      total: 50,
      activities: [
        {
          height: 6000000,
          beneficiary_name: "John Doe",
          beneficiary_address: "0x1234",
          amount: 50,
          mode: "PERMISSIONLESS_RETIREMENT",
          token: {
            org_uid: 'b964b67129b451a8a3579e99e4f63742f8f5151b848b90c07ff6ccdfe9fb4a12',
          },
          cw_unit: {
            marketplaceIdentifier:
              "0xf4d61bef9f3022cc2961ca8861c327d104c5e0761cb5fe010d718134d4cd4441",
          },
        },
        {
          height: 6000010,
          beneficiary_name: "JANE Doe",
          beneficiary_address: "0x1234",
          amount: 100,
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
      total: 0,
      activities: [],
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
