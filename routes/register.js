const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

const { v4: uuidv4 } = require("uuid");

router.post("/", (req, res) => {

    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({
            message: "Name and Email are required"
        });
    }

    const customerDid = "did:bank:" + uuidv4();

    const customerFolder = path.join(
        __dirname,
        "../storage",
        customerDid.replace(/:/g, "_")
    );

    fs.mkdirSync(customerFolder, { recursive: true });

    fs.writeFileSync(
        path.join(customerFolder, "customer.json"),
        JSON.stringify(
            {
                customerDid,
                name,
                email
            },
            null,
            2
        )
    );

    res.json({
        message: "Customer Registered",
        customerDid
    });

});

module.exports = router;