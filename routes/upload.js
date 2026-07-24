const express = require("express");
const router = express.Router();

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { Storage } = require("@google-cloud/storage");

// Google Cloud Storage
const storage = new Storage();
const bucket = storage.bucket("kyc-documents-team14"); // <-- Replace with your bucket name

// Temporary uploads folder
const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    dest: uploadDir
});

router.post("/", upload.single("document"), async (req, res) => {

    try {

        const customerDid = req.body.customerDid;

        if (!customerDid) {
            return res.status(400).json({
                message: "Customer DID Missing"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded"
            });
        }

        // Upload to Cloud Storage
        await bucket.upload(req.file.path, {
            destination: `${customerDid}/${req.file.originalname}`
        });

        // Delete temporary local file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: "Document uploaded successfully",
            customerDid: customerDid,
            file: req.file.originalname,
            bucketPath: `${customerDid}/${req.file.originalname}`
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Upload failed",
            error: err.message
        });

    }

});

module.exports = router;