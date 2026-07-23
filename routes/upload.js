const express = require("express");
const router = express.Router();

const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    dest: uploadDir
});

router.post("/", upload.single("document"), (req, res) => {

    const customerDid = req.body.customerDid;

    if (!customerDid) {
        return res.status(400).json({
            message: "Customer DID Missing"
        });
    }

    const customerFolder = path.join(
        process.cwd(),
        "storage",
        customerDid.replace(/:/g, "_")
    );

    if (!fs.existsSync(customerFolder)) {
        fs.mkdirSync(customerFolder, { recursive: true });
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