const express = require("express");
const router = express.Router();

const multer = require("multer");
const fs = require("fs");
const path = require("path");

const upload = multer({
    dest: "../uploads/"
});

router.post("/", upload.single("document"), (req, res) => {

    const customerDid = req.body.customerDid;

    if (!customerDid) {
        return res.status(400).json({
            message: "Customer DID Missing"
        });
    }

    const customerFolder = path.join(
        __dirname,
        "../storage",
        customerDid.replace(/:/g, "_")
    );

    if (!fs.existsSync(customerFolder)) {
        return res.status(404).json({
            message: "Customer not found"
        });
    }

    const destination = path.join(
        customerFolder,
        req.file.originalname
    );

    fs.renameSync(req.file.path, destination);

    res.json({
        message: "Document uploaded successfully"
    });

});

module.exports = router;